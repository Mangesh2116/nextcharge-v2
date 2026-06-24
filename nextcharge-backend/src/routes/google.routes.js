const express = require('express');
const router = express.Router();

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

/**
 * GET /api/v1/google/nearby
 */
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = '5000' } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: 'lat and lng query parameters are required' });
    }

    if (!GOOGLE_PLACES_API_KEY) {
      return res.status(500).json({ success: false, message: 'Google Places API key is not configured' });
    }

    const radiusMeters = parseFloat(radius);
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
            center: { latitude: parseFloat(lat), longitude: parseFloat(lng) },
            radius: radiusMeters
          }
        }
      })
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Google searchNearby API error:', response.status, text);
      return res.status(response.status).json({ success: false, message: `Google Places API error: ${response.status}` });
    }

    const data = await response.json();
    const places = data.places || [];

    const stations = places.map((place, index) => {
      const pLat = place.location?.latitude || 0;
      const pLng = place.location?.longitude || 0;
      const distance = getDistanceMeters(parseFloat(lat), parseFloat(lng), pLat, pLng);

      return {
        eLoc: place.id,
        placeName: place.displayName?.text || 'EV Charging Station',
        placeAddress: place.formattedAddress || '',
        latitude: pLat,
        longitude: pLng,
        distance,
        type: 'electric_vehicle_charging_station',
        keywords: '',
        orderIndex: index
      };
    });

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

    const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
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
      return res.status(response.status).json({ success: false, message: `Google Routes API error: ${response.status}` });
    }

    const data = await response.json();
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
