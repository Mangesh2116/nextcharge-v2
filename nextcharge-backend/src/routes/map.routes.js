const express = require('express');
const router = express.Router();
const BlockedStation = require('../models/BlockedStation');
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
          'Content-Type': 'application/x-www-form-urlencoded'
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

module.exports = router;
