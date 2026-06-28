const express = require('express');
const router = express.Router();
const BlockedStation = require('../models/BlockedStation');
const { getCache, setCache } = require('../config/redis');

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';
const GOOGLE_ROUTES_API_KEY = process.env.GOOGLE_ROUTES_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';

// Haversine distance calculator
function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Decode Google encoded polyline
function decodePolyline(encoded) {
  const points = [];
  let index = 0, len = encoded.length;
  let lat = 0, lng = 0;

  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    points.push([lng / 1e5, lat / 1e5]);
  }
  return points;
}

// Helper for OSM fallback
async function fetchOSMChargingStations(lat, lng, radiusMeters) {
  const osmQuery = `[out:json][timeout:25];(node["amenity"="charging_station"](around:${radiusMeters},${lat},${lng});way["amenity"="charging_station"](around:${radiusMeters},${lat},${lng});relation["amenity"="charging_station"](around:${radiusMeters},${lat},${lng}););out center;`;
  
  const mirrors = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://lz4.overpass-api.de/api/interpreter'
  ];

  for (const mirror of mirrors) {
    try {
      console.log(`[OSM Fallback] Attempting to fetch from OSM mirror: ${mirror}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      const response = await fetch(mirror, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'NextCharge/1.0 (apisupport@nextcharge.in)'
        },
        body: `data=${encodeURIComponent(osmQuery)}`,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data && data.elements) {
          console.log(`[OSM Fallback] Successfully fetched ${data.elements.length} stations from OSM mirror ${mirror}`);
          return data.elements;
        }
      } else {
        console.warn(`[OSM Fallback] OSM mirror ${mirror} returned status ${response.status}`);
      }
    } catch (e) {
      console.error(`[OSM Fallback] OSM mirror ${mirror} failed:`, e.message);
    }
  }
  return [];
}

/**
 * GET /api/v1/google/nearby
 */
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = '5000' } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: 'lat and lng query parameters are required' });
    }

    const radiusMeters = parseFloat(radius);
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);

    // Group queries within ~100m by rounding coordinates to 3 decimal places
    const roundedLat = parsedLat.toFixed(3);
    const roundedLng = parsedLng.toFixed(3);
    const cacheKey = `google:nearby:${roundedLat}:${roundedLng}:${radius}`;

    let rawStations = await getCache(cacheKey);

    if (rawStations) {
      console.log(`[Nearby Cache] Hit for key: ${cacheKey}`);
    } else {
      console.log(`[Nearby Cache] Miss for key: ${cacheKey}`);
      let places = [];
      let fetchSuccess = false;

      if (GOOGLE_PLACES_API_KEY) {
        try {
          const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
              'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location'
            },
            body: JSON.stringify({
              includedTypes: ['electric_vehicle_charging_station'],
              maxResultCount: 20,
              locationRestriction: {
                circle: {
                  center: { latitude: parsedLat, longitude: parsedLng },
                  radius: radiusMeters
                }
              }
            })
          });

          if (response.ok) {
            const data = await response.json();
            places = data.places || [];
            fetchSuccess = true;
            console.log(`[Nearby API] Successfully fetched ${places.length} stations from Google Places`);
          } else {
            const text = await response.text();
            console.error(`[Nearby API] Google SearchNearby failed with status ${response.status}: ${text}`);
          }
        } catch (err) {
          console.error('[Nearby API] Error calling Google Places API:', err.message);
        }
      } else {
        console.log('[Nearby API] Google Places API Key is missing. Skipping Google Places search.');
      }

      if (fetchSuccess) {
        // Map Google places to standard stations format
        rawStations = places.map((place, index) => {
          const pLat = place.location?.latitude || 0;
          const pLng = place.location?.longitude || 0;
          return {
            eLoc: place.id,
            placeName: place.displayName?.text || 'EV Charging Station',
            placeAddress: place.formattedAddress || '',
            latitude: pLat,
            longitude: pLng,
            type: 'electric_vehicle_charging_station',
            keywords: '',
            orderIndex: index
          };
        });
      } else {
        console.log('[Nearby API] Falling back to OpenStreetMap Overpass API...');
        try {
          const osmElements = await fetchOSMChargingStations(parsedLat, parsedLng, radiusMeters);
          rawStations = osmElements.map((element, index) => {
            const pLat = element.lat || element.center?.lat || 0;
            const pLng = element.lon || element.center?.lon || 0;
            const name = element.tags?.name || element.tags?.operator || element.tags?.brand || 'EV Charging Station (OSM)';
            let address = element.tags?.['addr:full'] || '';
            if (!address) {
              const street = element.tags?.['addr:street'] || '';
              const city = element.tags?.['addr:city'] || '';
              const postcode = element.tags?.['addr:postcode'] || '';
              address = [street, city, postcode].filter(Boolean).join(', ') || 'Charging Station Address';
            }
            return {
              eLoc: `osm-${element.type || 'node'}-${element.id}`,
              placeName: name,
              placeAddress: address,
              latitude: pLat,
              longitude: pLng,
              type: 'electric_vehicle_charging_station',
              keywords: '',
              orderIndex: index
            };
          });
        } catch (osmErr) {
          console.error('[Nearby API] OSM Overpass fetch failed:', osmErr.message);
          rawStations = [];
        }
      }

      // Final fallback: if no stations found (OSM returned 0/failed and Google Places failed/disabled)
      if (!rawStations || rawStations.length === 0) {
        console.log('[Nearby API] Fetch returned 0 stations. Triggering DB lookup...');
        
        // 1. Fetch from local database stations if any
        let dbStations = [];
        try {
          const Station = require('../models/Station');
          const localStations = await Station.find({
            status: 'active',
            location: {
              $near: {
                $geometry: { type: 'Point', coordinates: [parsedLng, parsedLat] },
                $maxDistance: radiusMeters
              }
            }
          }).limit(10);
          
          dbStations = localStations.map((s, index) => {
            const [sLng, sLat] = s.location.coordinates;
            return {
              eLoc: String(s._id),
              placeName: s.name,
              placeAddress: `${s.address.line1 || ''}, ${s.address.city || ''}, ${s.address.state || ''}`,
              latitude: sLat,
              longitude: sLng,
              type: 'electric_vehicle_charging_station',
              keywords: s.network || '',
              orderIndex: index
            };
          });
          console.log(`[Nearby API] Found ${dbStations.length} local DB stations in range`);
        } catch (dbErr) {
          console.error('[Nearby API] Failed to fetch local DB stations:', dbErr.message);
        }

        rawStations = dbStations;
      }

      // Save to cache for 1 hour (3600 seconds)
      await setCache(cacheKey, rawStations, 3600);
    }

    // Retrieve blocked station IDs
    const blockedIds = await BlockedStation.find().distinct('stationId');
    const blockedSet = new Set(blockedIds.map(id => String(id)));

    // Calculate exact distances from requested coordinates, and filter blocked stations
    const stations = rawStations
      .map(s => {
        const distance = getDistanceMeters(parsedLat, parsedLng, s.latitude, s.longitude);
        return {
          ...s,
          distance
        };
      })
      .filter(s => !blockedSet.has(s.eLoc));

    return res.json({
      success: true,
      count: stations.length,
      data: stations
    });
  } catch (err) {
    console.error('Google nearby proxy error:', err.message);
    return res.status(500).json({ success: false, message: err.message || 'Internal server error' });
  }
});

/**
 * POST /api/v1/google/route
 */
router.post('/route', async (req, res) => {
  try {
    const { start, destination, waypoints = [] } = req.body;

    if (!start || !destination) {
      return res.status(400).json({ success: false, message: 'start and destination are required' });
    }

    if (!GOOGLE_ROUTES_API_KEY) {
      return res.status(500).json({ success: false, message: 'Google Routes API key is not configured' });
    }

    const payload = {
      origin: {
        location: { latLng: { latitude: parseFloat(start.lat), longitude: parseFloat(start.lng) } }
      },
      destination: {
        location: { latLng: { latitude: parseFloat(destination.lat), longitude: parseFloat(destination.lng) } }
      },
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE',
      polylineQuality: 'HIGH_QUALITY',
      computeAlternativeRoutes: false
    };

    if (waypoints && waypoints.length > 0) {
      payload.intermediates = waypoints.map(w => ({
        location: { latLng: { latitude: parseFloat(w.lat), longitude: parseFloat(w.lng) } }
      }));
    }

    let response;
    let usingOSMFallback = false;
    let data;

    try {
      response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_ROUTES_API_KEY,
          'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const text = await response.text();
        console.error('Google computeRoutes API error:', response.status, text);
        usingOSMFallback = true;
      } else {
        data = await response.json();
      }
    } catch (err) {
      console.error('Google computeRoutes API network error, falling back to OSRM:', err.message);
      usingOSMFallback = true;
    }

    if (usingOSMFallback) {
      try {
        console.log('[OSM Routing Fallback] Requesting route from OSRM...');
        let osmCoords = [`${start.lng},${start.lat}`];
        if (waypoints && waypoints.length > 0) {
          waypoints.forEach(w => osmCoords.push(`${w.lng},${w.lat}`));
        }
        osmCoords.push(`${destination.lng},${destination.lat}`);
        const osmCoordsParam = osmCoords.join(';');

        const osmUrl = `https://router.project-osrm.org/route/v1/driving/${osmCoordsParam}?overview=full&geometries=geojson`;
        console.log(`[OSM Routing Fallback] Fetching: ${osmUrl}`);

        const osmRes = await fetch(osmUrl);
        if (!osmRes.ok) {
          throw new Error(`OSRM API error status: ${osmRes.status}`);
        }
        const osmData = await osmRes.json();
        if (osmData.code !== 'Ok' || !osmData.routes || osmData.routes.length === 0) {
          throw new Error(`OSRM API returned no route: ${osmData.code}`);
        }

        const route = osmData.routes[0];
        console.log(`[OSM Routing Fallback] Successfully fetched route via OSRM. Distance: ${route.distance}m, Duration: ${route.duration}s`);
        return res.json({
          success: true,
          data: {
            geometry: route.geometry,
            distance: route.distance,
            duration: route.duration
          }
        });
      } catch (osmErr) {
        console.error('[OSM Routing Fallback] OSRM routing fallback also failed:', osmErr.message);
        return res.status(502).json({ success: false, message: `Routing failed: Google Routes API failed, and OSRM fallback failed with: ${osmErr.message}` });
      }
    }

    if (!data.routes || data.routes.length === 0) {
      return res.status(404).json({ success: false, message: 'No route found' });
    }

    const route = data.routes[0];
    const durationSeconds = parseInt(route.duration?.replace('s', '')) || 0;
    const distanceMeters = route.distanceMeters || 0;
    const coordinates = decodePolyline(route.polyline.encodedPolyline);

    return res.json({
      success: true,
      data: {
        geometry: {
          type: 'LineString',
          coordinates
        },
        distance: distanceMeters,
        duration: durationSeconds
      }
    });
  } catch (err) {
    console.error('Google route proxy error:', err.message);
    return res.status(500).json({ success: false, message: err.message || 'Internal server error' });
  }
});

/**
 * GET /api/v1/google/search-address
 */
router.get('/search-address', async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ success: false, message: 'query parameter is required' });
    }

    if (!GOOGLE_PLACES_API_KEY) {
      return res.status(500).json({ success: false, message: 'Google Places API key is not configured' });
    }

    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location'
      },
      body: JSON.stringify({
        textQuery: query,
        maxResultCount: 5
      })
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Google searchText API error:', response.status, text);
      return res.status(response.status).json({ success: false, message: `Google Places API error: ${response.status}` });
    }

    const data = await response.json();
    const places = data.places || [];

    const suggestions = places.map(place => ({
      name: place.formattedAddress || place.displayName?.text || 'Location',
      lat: place.location?.latitude || 0,
      lng: place.location?.longitude || 0
    }));

    return res.json({
      success: true,
      data: suggestions
    });
  } catch (err) {
    console.error('Google autocomplete proxy error:', err.message);
    return res.status(500).json({ success: false, message: err.message || 'Internal server error' });
  }
});

module.exports = router;
