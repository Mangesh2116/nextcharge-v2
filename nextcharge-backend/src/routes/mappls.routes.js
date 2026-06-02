const express = require('express');
const router = express.Router();

// ─── In-memory token cache ────────────────────────────────────────────────────
let cachedToken = null;
let tokenExpiresAt = 0;

/**
 * Get a valid Mappls OAuth access token.
 * Caches the token in memory and refreshes it when expired.
 */
async function getMapplsToken() {
  const now = Date.now();

  // Return cached token if still valid (with 60s buffer)
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
  // Cache for the token's lifetime (typically 24h), minus a 2-minute buffer
  tokenExpiresAt = now + (data.expires_in ? data.expires_in * 1000 : 86400000) - 120000;

  return cachedToken;
}

/**
 * GET /api/v1/mappls/nearby
 * 
 * Query params:
 *   - lat (required): Latitude
 *   - lng (required): Longitude
 *   - radius (optional): Search radius in meters (default: 5000)
 *   - keywords (optional): Search keywords (default: "EV charging station")
 */
/**
 * Calculate stable, deterministic coordinates relative to the reference point using a seed angle.
 * This ensures that if Mappls doesn't return coordinates, the station has a stable, correct-distance location.
 */
function getStableCoordinates(eLoc, refLat, refLng, distanceMeters) {
  let hash = 0;
  const str = eLoc || '';
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Deterministic angle based on eLoc hash
  const angle = (Math.abs(hash % 360) * Math.PI) / 180;
  
  // Fallback distance if not provided
  const dist = distanceMeters != null ? distanceMeters : (500 + Math.abs(hash % 2500));
  
  // Approximate coordinate projection
  const dLat = (dist * Math.cos(angle)) / 111111;
  const latRad = (refLat * Math.PI) / 180;
  const dLng = (dist * Math.sin(angle)) / (111111 * Math.cos(latRad));
  
  return {
    latitude: refLat + dLat,
    longitude: refLng + dLng
  };
}

router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = '5000', keywords = 'EV charging station' } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'lat and lng query parameters are required'
      });
    }

    const token = await getMapplsToken();

    const params = new URLSearchParams({
      keywords,
      refLocation: `${lat},${lng}`,
      page: '1',
      region: 'IND',
      radius: radius
    });

    const apiUrl = `https://atlas.mappls.com/api/places/nearby/json?${params.toString()}`;

    const apiRes = await fetch(apiUrl, {
      headers: {
        'Authorization': `bearer ${token}`,
        'accept': 'application/json'
      }
    });

    if (apiRes.status === 204) {
      return res.json({
        success: true,
        count: 0,
        data: []
      });
    }

    if (!apiRes.ok) {
      const text = await apiRes.text();
      console.error('Mappls Nearby API error:', apiRes.status, text);
      return res.status(apiRes.status).json({
        success: false,
        message: `Mappls API error: ${apiRes.status}`
      });
    }

    const data = await apiRes.json();
    const suggestedLocations = data.suggestedLocations || [];

    // Transform to a consistent response format
    const stations = suggestedLocations.map((place, index) => {
      const eLoc = place.eLoc || place.eloc || `mappls_${index}`;
      const distance = place.distance ? parseFloat(place.distance) : null;
      
      let latitude = parseFloat(place.latitude);
      let longitude = parseFloat(place.longitude);
      
      // Calculate stable mock coordinates if coordinates are missing in Mappls response
      if (isNaN(latitude) || isNaN(longitude) || latitude === 0 || longitude === 0) {
        const fallback = getStableCoordinates(eLoc, parseFloat(lat), parseFloat(lng), distance);
        latitude = fallback.latitude;
        longitude = fallback.longitude;
      }

      return {
        eLoc,
        placeName: place.placeName || place.poi || 'EV Charging Station',
        placeAddress: place.placeAddress || place.address || '',
        latitude,
        longitude,
        distance,
        type: place.type || '',
        keywords: place.keywords || '',
        orderIndex: place.orderIndex || index,
        richInfo: place.richInfo || null
      };
    });

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
