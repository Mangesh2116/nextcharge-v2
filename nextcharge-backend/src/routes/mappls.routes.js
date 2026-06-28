const express = require('express');
const router = express.Router();
const BlockedStation = require('../models/BlockedStation');
const { getCache, setCache } = require('../config/redis');

// ─── In-memory token cache (for OAuth fallback) ──────────────────────────────
let cachedToken = null;
let tokenExpiresAt = 0;

/**
 * Get a valid Mappls OAuth access token.
 */
async function getMapplsToken() {
  const now = Date.now();

  if (cachedToken && tokenExpiresAt > now + 60000) {
    return cachedToken;
  }

  const clientId = process.env.MAPPLS_CLIENT_ID;
  const clientSecret = process.env.MAPPLS_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Mappls API credentials not configured');
  }

  const res = await fetch('https://outpost.mappls.com/api/security/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'accept': 'application/json'
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Mappls token error (${res.status}): ${text}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiresAt = now + (data.expires_in ? data.expires_in * 1000 : 86400000) - 120000;

  return cachedToken;
}

// ─── Location & Helpers ──────────────────────────────────────────────────────
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
 * GET /api/v1/mappls/nearby
 */
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = '5000', keywords = 'EV charging station' } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'lat and lng query parameters are required'
      });
    }

    const radiusMeters = parseFloat(radius);
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);

    const roundedLat = parsedLat.toFixed(3);
    const roundedLng = parsedLng.toFixed(3);
    const cacheKey = `mappls:nearby:${roundedLat}:${roundedLng}:${radius}:${keywords}`;

    let rawStations = await getCache(cacheKey);

    if (rawStations) {
      console.log(`[Nearby Cache] Hit for key: ${cacheKey}`);
    } else {
      console.log(`[Nearby Cache] Miss for key: ${cacheKey}`);
      let mapplsMapped = [];
      const staticKey = process.env.MAPPLS_REST_KEY;

      if (staticKey) {
        try {
          console.log('[Nearby API] Calling Mappls Nearby API with Static Key...');
          const params = new URLSearchParams({
            keywords,
            refLocation: `${lat},${lng}`,
            page: '1',
            region: 'IND',
            radius: radius,
            access_token: staticKey
          });
          const apiUrl = `https://search.mappls.com/search/places/nearby/json?${params.toString()}`;
          console.log(`[Nearby API] Request URL: ${apiUrl}`);

          const apiRes = await fetch(apiUrl, { headers: { 'accept': 'application/json' } });
          const text = await apiRes.text();
          console.log('[Nearby API] Raw Mappls API Response:', text);

          if (apiRes.ok) {
            const data = JSON.parse(text);
            const suggestedLocations = data.suggestedLocations || [];
            mapplsMapped = suggestedLocations.map((place, index) => {
              const eLoc = place.eLoc || place.eloc || `mappls_${index}`;
              const pLat = parseFloat(place.latitude || place.entryLatitude || place.lat || 0);
              const pLng = parseFloat(place.longitude || place.entryLongitude || place.lng || place.lon || 0);
              return {
                eLoc,
                placeName: place.placeName || place.poi || 'EV Charging Station',
                placeAddress: place.placeAddress || place.address || '',
                latitude: pLat,
                longitude: pLng,
                type: place.type || 'electric_vehicle_charging_station',
                keywords: place.keywords || '',
                orderIndex: index
              };
            });
            console.log(`[Nearby API] Successfully fetched ${mapplsMapped.length} stations using Mappls Static Key`);
          } else {
            console.error(`[Nearby API] Mappls search returned error status ${apiRes.status}: ${text}`);
          }
        } catch (err) {
          console.error('[Nearby API] Error calling Mappls with Static Key:', err.message);
        }
      } else {
        console.warn('[Nearby API] MAPPLS_REST_KEY env variable is not set!');
      }

      rawStations = mapplsMapped;
      await setCache(cacheKey, rawStations, 3600);
    }

    // Retrieve blocked station IDs and filter them out
    const blockedIds = await BlockedStation.find().distinct('stationId');
    const blockedSet = new Set(blockedIds.map(id => String(id)));

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
    console.error('Mappls proxy error:', err.message);
    return res.status(500).json({
      success: false,
      message: err.message || 'Internal server error'
    });
  }
});

module.exports = router;
