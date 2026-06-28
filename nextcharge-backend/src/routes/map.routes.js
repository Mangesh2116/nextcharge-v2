const express = require('express');
const router = express.Router();
const BlockedStation = require('../models/BlockedStation');
const Station = require('../models/Station');
const { getCache, setCache } = require('../config/redis');

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

// Helper for OSM fallback — fetch charging stations from Overpass API
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
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
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
 * GET /api/v1/map/nearby
 * 
 * Fetches nearby EV charging stations using OSM Overpass API.
 * This replaces the old Google Places endpoint.
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
    const cacheKey = `map:nearby:${roundedLat}:${roundedLng}:${radius}`;

    let rawStations = await getCache(cacheKey);

    if (rawStations) {
      console.log(`[Nearby Cache] Hit for key: ${cacheKey}`);
    } else {
      console.log(`[Nearby Cache] Miss for key: ${cacheKey}`);

      // Fetch from OpenStreetMap Overpass API
      console.log('[Nearby API] Fetching from OpenStreetMap Overpass API...');
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
    console.error('Map nearby proxy error:', err.message);
    return res.status(500).json({ success: false, message: err.message || 'Internal server error' });
  }
});

/**
 * POST /api/v1/map/route
 * 
 * Computes a driving route using OSRM (OpenStreetMap routing).
 * This replaces the old Google Routes endpoint.
 */
router.post('/route', async (req, res) => {
  try {
    const { start, destination, waypoints = [] } = req.body;

    if (!start || !destination) {
      return res.status(400).json({ success: false, message: 'start and destination are required' });
    }

    let osmCoords = [`${start.lng},${start.lat}`];
    if (waypoints && waypoints.length > 0) {
      waypoints.forEach(w => osmCoords.push(`${w.lng},${w.lat}`));
    }
    osmCoords.push(`${destination.lng},${destination.lat}`);
    const osmCoordsParam = osmCoords.join(';');

    const osmUrl = `https://router.project-osrm.org/route/v1/driving/${osmCoordsParam}?overview=full&geometries=geojson`;
    console.log(`[OSRM Routing] Fetching: ${osmUrl}`);

    const osmRes = await fetch(osmUrl);
    if (!osmRes.ok) {
      throw new Error(`OSRM API error status: ${osmRes.status}`);
    }
    const osmData = await osmRes.json();
    if (osmData.code !== 'Ok' || !osmData.routes || osmData.routes.length === 0) {
      throw new Error(`OSRM API returned no route: ${osmData.code}`);
    }

    const route = osmData.routes[0];
    console.log(`[OSRM Routing] Successfully fetched route. Distance: ${route.distance}m, Duration: ${route.duration}s`);
    return res.json({
      success: true,
      data: {
        geometry: route.geometry,
        distance: route.distance,
        duration: route.duration
      }
    });
  } catch (err) {
    console.error('Map route proxy error:', err.message);
    return res.status(500).json({ success: false, message: err.message || 'Internal server error' });
  }
});

/**
 * GET /api/v1/map/search-address
 * 
 * Geocodes address using Nominatim (OpenStreetMap).
 * This replaces the old Google Places text search endpoint.
 */
router.get('/search-address', async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ success: false, message: 'query parameter is required' });
    }

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&limit=5`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'NextCharge/1.0 (https://nextcharge.in)'
      }
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Nominatim API error:', response.status, text);
      return res.status(response.status).json({ success: false, message: `Nominatim API error: ${response.status}` });
    }

    const data = await response.json();
    const suggestions = data.map(place => ({
      name: place.display_name || 'Location',
      lat: parseFloat(place.lat) || 0,
      lng: parseFloat(place.lon) || 0
    }));

    return res.json({
      success: true,
      data: suggestions
    });
  } catch (err) {
    console.error('Map search-address proxy error:', err.message);
    return res.status(500).json({ success: false, message: err.message || 'Internal server error' });
  }
});

// Helper for OSM bounding box search
async function fetchOSMChargingStationsBBox(south, west, north, east) {
  const osmQuery = `[out:json][timeout:25];(node["amenity"="charging_station"](${south},${west},${north},${east});way["amenity"="charging_station"](${south},${west},${north},${east});relation["amenity"="charging_station"](${south},${west},${north},${east}););out center;`;
  
  const mirrors = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://lz4.overpass-api.de/api/interpreter'
  ];

  for (const mirror of mirrors) {
    try {
      console.log(`[OSM BBox Fallback] Attempting to fetch from OSM mirror: ${mirror}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
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
          console.log(`[OSM BBox Fallback] Successfully fetched ${data.elements.length} stations from OSM mirror ${mirror}`);
          return data.elements;
        }
      } else {
        console.warn(`[OSM BBox Fallback] OSM mirror ${mirror} returned status ${response.status}`);
      }
    } catch (e) {
      console.error(`[OSM BBox Fallback] OSM mirror ${mirror} failed:`, e.message);
    }
  }
  return [];
}

/**
 * GET /api/v1/map/bounds
 * 
 * Unified route to query Mappls, OSM Overpass, local database, and mock fallbacks
 * using the visible map bounding box parameters.
 */
router.get('/bounds', async (req, res) => {
  try {
    const { south, west, north, east, zoom } = req.query;

    if (!south || !west || !north || !east) {
      return res.status(400).json({
        success: false,
        message: 'south, west, north, and east query parameters are required'
      });
    }

    const z = parseFloat(zoom) || 12;
    const cacheKey = `map:bounds:${south}:${west}:${north}:${east}:${zoom}`;
    
    let rawStations = await getCache(cacheKey);

    if (rawStations) {
      console.log(`[Bounds Cache] Hit for key: ${cacheKey}`);
    } else {
      console.log(`[Bounds Cache] Miss for key: ${cacheKey}`);
      const staticKey = process.env.MAPPLS_REST_KEY;
      const lat = (parseFloat(north) + parseFloat(south)) / 2;
      const lng = (parseFloat(east) + parseFloat(west)) / 2;

      let radiusMeters = 5000;
      if (z <= 5) radiusMeters = 100000;
      else if (z <= 8) radiusMeters = 40000;
      else if (z <= 10) radiusMeters = 20000;
      else if (z <= 12) radiusMeters = 10000;
      else if (z <= 14) radiusMeters = 5000;
      else radiusMeters = 2000;

      // Query Mappls, OSM, and local DB in parallel
      const [mapplsRes, osmRes, dbRes] = await Promise.allSettled([
        // 1. Mappls Nearby Search
        (async () => {
          if (!staticKey) {
            console.warn('[Bounds API] MAPPLS_REST_KEY is not set!');
            return [];
          }
          try {
            console.log('[Bounds API] Calling Mappls Nearby API with Static Key...');
            const params = new URLSearchParams({
              keywords: 'EV charging station',
              refLocation: `${lat},${lng}`,
              page: '1',
              region: 'IND',
              radius: String(radiusMeters),
              access_token: staticKey
            });
            const apiUrl = `https://search.mappls.com/search/places/nearby/json?${params.toString()}`;
            console.log(`[Bounds API] Request URL: ${apiUrl}`);
            
            const apiRes = await fetch(apiUrl, { headers: { 'accept': 'application/json' } });
            const text = await apiRes.text();
            console.log('[Bounds API] Raw Mappls API Response:', text);

            if (apiRes.ok) {
              const data = JSON.parse(text);
              const suggestedLocations = data.suggestedLocations || [];
              return suggestedLocations.map((place, index) => {
                const eLoc = place.eLoc || place.eloc || `mappls_${index}`;
                const pLat = parseFloat(place.latitude || place.entryLatitude || place.lat || 0);
                const pLng = parseFloat(place.longitude || place.entryLongitude || place.lng || place.lon || 0);
                return {
                  _id: eLoc,
                  eLoc,
                  placeName: place.placeName || place.poi || 'EV Charging Station',
                  placeAddress: place.placeAddress || place.address || '',
                  latitude: pLat,
                  longitude: pLng,
                  type: place.type || 'electric_vehicle_charging_station',
                  keywords: place.keywords || '',
                  orderIndex: index,
                  _source: 'mappls'
                };
              });
            } else {
              console.error(`[Bounds API] Mappls search returned status ${apiRes.status}`);
              return [];
            }
          } catch (err) {
            console.error('[Bounds API] Mappls search error:', err.message);
            return [];
          }
        })(),
        // 2. OpenStreetMap BBox
        (async () => {
          try {
            console.log('[Bounds API] Fetching from OpenStreetMap Overpass BBox...');
            const osmElements = await fetchOSMChargingStationsBBox(south, west, north, east);
            return osmElements.map((element, index) => {
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
              const eLoc = `osm-${element.type || 'node'}-${element.id}`;
              return {
                _id: eLoc,
                eLoc,
                placeName: name,
                placeAddress: address,
                latitude: pLat,
                longitude: pLng,
                type: 'electric_vehicle_charging_station',
                keywords: element.tags?.operator || element.tags?.brand || '',
                orderIndex: index,
                _source: 'osm'
              };
            });
          } catch (err) {
            console.error('[Bounds API] OSM fetch error:', err.message);
            return [];
          }
        })(),
        // 3. Local MongoDB spatial query
        (async () => {
          try {
            console.log('[Bounds API] Fetching from local MongoDB bbox...');
            const localStations = await Station.find({
              status: 'active',
              location: {
                $geoWithin: {
                  $box: [
                    [parseFloat(west), parseFloat(south)],
                    [parseFloat(east), parseFloat(north)]
                  ]
                }
              }
            }).limit(50);

            return localStations.map((s, index) => {
              const [sLng, sLat] = s.location.coordinates;
              return {
                _id: String(s._id),
                eLoc: String(s._id),
                placeName: s.name,
                placeAddress: `${s.address.line1 || ''}, ${s.address.city || ''}, ${s.address.state || ''}`,
                latitude: sLat,
                longitude: sLng,
                type: 'electric_vehicle_charging_station',
                keywords: s.network || '',
                orderIndex: index,
                _source: 'nextcharge'
              };
            });
          } catch (err) {
            console.error('[Bounds API] DB fetch error:', err.message);
            return [];
          }
        })()
      ]);

      const mapplsMapped = mapplsRes.status === 'fulfilled' ? mapplsRes.value : [];
      const osmMapped = osmRes.status === 'fulfilled' ? osmRes.value : [];
      const dbMapped = dbRes.status === 'fulfilled' ? dbRes.value : [];

      console.log(`[Bounds API] Raw query results: Mappls=${mapplsMapped.length}, OSM=${osmMapped.length}, MongoDB=${dbMapped.length}`);

      // Merge and deduplicate by coordinates proximity (<50m) or name/provider similarity (<150m)
      const allStations = [...mapplsMapped, ...osmMapped, ...dbMapped];
      const merged = [];

      for (const station of allStations) {
        const isDuplicate = merged.some(existing => {
          const dist = getDistanceMeters(station.latitude, station.longitude, existing.latitude, existing.longitude);
          if (dist < 50) return true;
          if (dist < 150) {
            const name1 = station.placeName.toLowerCase();
            const name2 = existing.placeName.toLowerCase();
            if (name1.includes(name2) || name2.includes(name1)) return true;
            
            const prov1 = (station.keywords || '').toLowerCase();
            const prov2 = (existing.keywords || '').toLowerCase();
            if (prov1 && prov2 && (prov1.includes(prov2) || prov2.includes(prov1))) return true;
          }
          return false;
        });

        if (!isDuplicate) {
          merged.push(station);
        }
      }

      console.log(`[Bounds API] Final merged and deduplicated stations: ${merged.length}`);
      rawStations = merged;
      await setCache(cacheKey, rawStations, 3600);
    }

    // Filter blocked stations
    const blockedIds = await BlockedStation.find().distinct('stationId');
    const blockedSet = new Set(blockedIds.map(id => String(id)));
    const finalStations = rawStations.filter(s => !blockedSet.has(s.eLoc));

    return res.json({
      success: true,
      count: finalStations.length,
      data: finalStations
    });

  } catch (err) {
    console.error('Bounds API error:', err.message);
    return res.status(500).json({
      success: false,
      message: err.message || 'Internal server error'
    });
  }
});

module.exports = router;
