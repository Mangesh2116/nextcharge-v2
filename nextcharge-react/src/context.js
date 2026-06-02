import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { apiCall, API_BASE } from './data';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export function AppProvider({ children }) {
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem('nc_user')); } catch { return null; } });
  const [token, setToken] = useState(() => localStorage.getItem('nc_token') || null);
  const [toasts, setToasts] = useState([]);
  const [authModal, setAuthModal] = useState(null);
  const [bookingModal, setBookingModal] = useState(false);
  const [selectedStation, setSelectedStation] = useState(null);
  const [backendOnline, setBackendOnline] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('nc_theme') || 'dark');
  const [articleEditorModal, setArticleEditorModal] = useState(false);

  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); }, [theme]);
  useEffect(() => { apiCall('/stations?limit=1').then(r => setBackendOnline(r.ok)); }, []);

  const toggleTheme = useCallback(() => {
    setTheme(t => {
      const next = t === 'dark' ? 'light' : 'dark';
      localStorage.setItem('nc_theme', next);
      document.documentElement.setAttribute('data-theme', next);
      return next;
    });
  }, []);

  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3800);
  }, []);

  const login = useCallback(async (emailOrPhone, password) => {
    const r = await apiCall('/auth/login', { method: 'POST', body: { emailOrPhone, password } });
    if (!r.ok) throw new Error(r.error || 'Invalid credentials');
    const tok = r.data.token; const u = r.data.user;
    localStorage.setItem('nc_token', tok); localStorage.setItem('nc_user', JSON.stringify(u));
    setToken(tok); setUser(u); return u;
  }, []);

  const signup = useCallback(async (payload) => {
    const r = await apiCall('/auth/register', { method: 'POST', body: payload });
    if (!r.ok) throw new Error(r.error || 'Registration failed');
    const tok = r.data.token; const u = r.data.user;
    localStorage.setItem('nc_token', tok); localStorage.setItem('nc_user', JSON.stringify(u));
    setToken(tok); setUser(u); return u;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('nc_token'); localStorage.removeItem('nc_user');
    setToken(null); setUser(null); showToast('Signed out. See you soon!', 'info');
  }, [showToast]);

  const createBooking = useCallback(async (payload) => {
    if (!token) throw new Error('Not authenticated');
    const r = await apiCall('/bookings', { method: 'POST', body: payload }, token);
    if (!r.ok) throw new Error(r.error || 'Booking failed');
    return r.data;
  }, [token]);

  const googleLogin = useCallback(async (credential) => {
    const r = await apiCall('/auth/google', { method: 'POST', body: { credential } });
    if (!r.ok) throw new Error(r.error || 'Google sign-in failed');
    const tok = r.data.token; const u = r.data.user;
    localStorage.setItem('nc_token', tok); localStorage.setItem('nc_user', JSON.stringify(u));
    setToken(tok); setUser(u); return u;
  }, []);

  const searchStations = useCallback(async (query) => {
    const ep = query ? '/stations?search=' + encodeURIComponent(query) : '/stations';
    const r = await apiCall(ep);
    if (!r.ok) return null;
    const items = r.data.data || [];
    return items.map(s => {
      const lng = s.location?.coordinates?.[0] || 72.8656;
      const lat = s.location?.coordinates?.[1] || 19.0596;
      const addrStr = s.address 
        ? `${s.address.line1 || ''}, ${s.address.city || ''}`.trim().replace(/^, |,$/g, '') 
        : 'Mumbai, Maharashtra';
      const connectorStrings = s.connectors 
        ? [...new Set(s.connectors.map(c => typeof c === 'string' ? c : c.type))] 
        : ['CCS2'];
      const computedStatus = s.connectors?.some(c => c.status === 'available') ? 'available' : 'busy';
      const total = s.stats?.totalConnectors || s.connectors?.length || 1;
      const avail = s.stats?.availableConnectors ?? s.connectors?.filter(c => c.status === 'available').length ?? 1;
      const portsOpenStr = `${avail}/${total}`;
      const speed = s.maxPowerKw || (s.connectors && s.connectors.length ? Math.max(...s.connectors.map(c => c.powerKw)) : 7.2);
      const maxSpeedStr = `${speed} kW`;
      const minPrice = s.priceRange?.min || (s.connectors && s.connectors.length ? Math.min(...s.connectors.map(c => c.pricePerKwh)) : 8);
      const priceStr = `₹${minPrice}/kWh`;

      let icon = '⚡';
      if (s.network === 'Ather') icon = '🔋';
      else if (s.isFeatured) icon = '⭐';
      else if (s.is24x7) icon = '🏪';

      return {
        ...s,
        icon,
        address: addrStr,
        rawAddress: s.address,
        distance: s.distanceKm ? `${s.distanceKm} km` : '1.2 km',
        portsOpen: portsOpenStr,
        maxSpeed: maxSpeedStr,
        price: priceStr,
        connectors: connectorStrings,
        rawConnectors: s.connectors,
        status: computedStatus,
        lat,
        lng
      };
    });
  }, []);

  // ─── Article Functions ─────────────────────────────────────────────────────
  const fetchArticles = useCallback(async (page = 1, tag = '') => {
    const ep = `/articles?page=${page}&limit=12` + (tag ? `&tag=${encodeURIComponent(tag)}` : '');
    const r = await apiCall(ep);
    if (!r.ok) return { articles: [], pagination: null };
    return { articles: r.data.data || [], pagination: r.data.pagination || null };
  }, []);

  const fetchArticle = useCallback(async (slug) => {
    const r = await apiCall(`/articles/${slug}`);
    if (!r.ok) return null;
    return r.data.article || null;
  }, []);

  const fetchAdminArticles = useCallback(async (page = 1) => {
    const r = await apiCall(`/articles/admin/all?page=${page}&limit=50`, {}, token);
    if (!r.ok) return [];
    return r.data.data || [];
  }, [token]);

  const createArticle = useCallback(async (formData) => {
    if (!token) throw new Error('Not authenticated');
    const res = await fetch(API_BASE + '/articles', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token },
      body: formData
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.message || 'Failed to create article');
    return json.article || json;
  }, [token]);

  const updateArticle = useCallback(async (id, formData) => {
    if (!token) throw new Error('Not authenticated');
    const res = await fetch(API_BASE + '/articles/' + id, {
      method: 'PUT',
      headers: { 'Authorization': 'Bearer ' + token },
      body: formData
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.message || 'Failed to update article');
    return json.article || json;
  }, [token]);

  const deleteArticle = useCallback(async (id) => {
    if (!token) throw new Error('Not authenticated');
    const r = await apiCall('/articles/' + id, { method: 'DELETE' }, token);
    if (!r.ok) throw new Error(r.error || 'Failed to delete article');
    return true;
  }, [token]);

  const fetchNearbyStations = useCallback(async (lat, lng, radius = 5000) => {
    try {
      const ep = `/google/nearby?lat=${lat}&lng=${lng}&radius=${radius}`;
      const r = await apiCall(ep);
      if (!r.ok || !r.data?.data) return [];

      return r.data.data.map((place, i) => {
        // Parse connector types from keywords/name
        const text = `${place.placeName} ${place.keywords || ''}`.toLowerCase();
        const connectors = [];
        if (text.includes('ccs') || text.includes('dc fast')) connectors.push('CCS2');
        if (text.includes('chademo')) connectors.push('CHAdeMO');
        if (text.includes('type 2') || text.includes('ac')) connectors.push('Type 2 AC');
        if (text.includes('bharat')) connectors.push('Bharat DC');
        if (connectors.length === 0) connectors.push('CCS2', 'Type 2 AC');

        // Infer speed from keywords
        let maxSpeed = '50 kW';
        if (text.includes('fast') || text.includes('dc')) maxSpeed = '60 kW';
        if (text.includes('supercharger') || text.includes('ultra')) maxSpeed = '150 kW';
        if (text.includes('slow') || (text.includes('ac') && !text.includes('dc'))) maxSpeed = '7.2 kW';

        // Icon based on name
        let icon = '⚡';
        if (text.includes('tata')) icon = '🔋';
        else if (text.includes('ather')) icon = '🛵';
        else if (text.includes('bpcl') || text.includes('iocl') || text.includes('hpcl')) icon = '⛽';
        else if (text.includes('reliance') || text.includes('jio')) icon = '🏪';
        else if (text.includes('mg') || text.includes('hyundai') || text.includes('mercedes')) icon = '🚗';
        else if (text.includes('chargezone') || text.includes('statiq') || text.includes('fortum')) icon = '🔌';

        const distKm = place.distance != null
          ? (place.distance / 1000).toFixed(1) + ' km'
          : '—';

        return {
          _id: place.eLoc || `mappls_${i}`,
          icon,
          name: place.placeName || 'EV Charging Station',
          address: place.placeAddress || '',
          distance: distKm,
          portsOpen: '—',
          maxSpeed,
          price: '₹15/kWh',
          connectors,
          status: 'available',
          lat: place.latitude,
          lng: place.longitude,
          mapPos: null,
          _source: 'mappls'
        };
      });
    } catch (err) {
      console.error('fetchNearbyStations error:', err);
      return [];
    }
  }, []);

  // ─── OpenStreetMap / Nominatim Search ───────────────────────────────────────
  const searchAddressNominatim = useCallback(async (queryText) => {
    if (!queryText?.trim()) return [];
    try {
      const r = await apiCall(`/google/search-address?query=${encodeURIComponent(queryText)}`);
      if (!r.ok || !r.data?.data) return [];
      return r.data.data;
    } catch (err) {
      console.error('searchAddressNominatim error:', err);
      return [];
    }
  }, []);
  // ─── OpenStreetMap / Overpass API Fetcher ──────────────────────────────────
  const fetchOSMChargingStations = useCallback(async (params) => {
    const { south, west, north, east, lat, lng, radius } = params;
    let query = '';
    
    if (south !== undefined && west !== undefined && north !== undefined && east !== undefined) {
      query = `[out:json];node["amenity"="charging_station"](${south},${west},${north},${east});out;`;
    } else if (lat !== undefined && lng !== undefined) {
      const rad = radius || 10000;
      const deg = rad / 111000;
      const s = lat - deg;
      const w = lng - deg;
      const n = lat + deg;
      const e = lng + deg;
      query = `[out:json];node["amenity"="charging_station"](${s},${w},${n},${e});out;`;
    } else {
      return [];
    }    const mirrors = [
      'https://overpass.kumi.systems/api/interpreter',
      'https://overpass.openstreetmap.ru/api/interpreter',
      'https://overpass-api.de/api/interpreter'
    ];

    let data = null;
    let success = false;

    for (const mirror of mirrors) {
      try {
        const url = `${mirror}?data=${encodeURIComponent(query)}`;
        const res = await fetch(url);
        if (res.ok) {
          data = await res.json();
          success = true;
          break;
        } else {
          console.warn(`Mirror ${mirror} returned error status: ${res.status}`);
        }
      } catch (err) {
        console.warn(`Failed to fetch from Overpass mirror: ${mirror}`, err);
      }
    }

    if (!success || !data) {
      console.error('All Overpass API mirrors failed to return charging stations.');
      return [];
    }

    try {
      const stations = [];
      if (!data.elements) return [];

      data.elements.forEach((el, i) => {
        if (el.type === 'node' && el.lat && el.lon) {
          const tags = el.tags || {};
          const name = tags.name || tags.operator || tags.brand || 'EV Charging Station';
          
          const connectors = [];
          const text = `${name} ${tags['socket:ccs2']?'ccs2':''} ${tags['socket:type2']?'type2':''} ${tags['socket:chademo']?'chademo':''}`.toLowerCase();
          if (tags['socket:ccs2'] || tags['socket:ccs2:combo'] || tags['socket:combo'] || text.includes('ccs')) {
            connectors.push('CCS2');
          }
          if (tags['socket:type2'] || tags['socket:type2_combo'] || tags['socket:type2_cable'] || text.includes('type 2') || text.includes('type2')) {
            connectors.push('Type 2 AC');
          }
          if (tags['socket:chademo'] || text.includes('chademo')) {
            connectors.push('CHAdeMO');
          }
          if (tags['socket:schuko'] || text.includes('schuko')) {
            connectors.push('Schuko AC');
          }
          if (connectors.length === 0) {
            connectors.push('CCS2', 'Type 2 AC');
          }

          let power = 50;
          if (tags.power) {
            power = parseFloat(tags.power);
          } else if (tags.max_power) {
            power = parseFloat(tags.max_power);
          } else {
            if (text.includes('fast') || text.includes('dc')) power = 60;
            if (text.includes('supercharger')) power = 150;
            if (text.includes('slow') || text.includes('ac')) power = 7.2;
          }
          if (isNaN(power)) power = 50;

          const totalConnectors = parseInt(tags.capacity) || connectors.length || 2;
          const rand = Math.random();
          const status = rand > 0.4 ? 'available' : rand > 0.15 ? 'charging' : 'offline';
          const availCount = status === 'available' ? Math.max(1, Math.floor(Math.random() * totalConnectors)) : 0;
          const portsOpen = `${availCount}/${totalConnectors}`;

          const street = tags['addr:street'] || '';
          const city = tags['addr:city'] || '';
          const fullAddr = [street, city].filter(Boolean).join(', ') || tags['addr:full'] || 'Charging Station Location';

          stations.push({
            _id: `osm_node_${el.id}`,
            icon: power >= 50 ? '⚡' : '🔌',
            name,
            address: fullAddr,
            distance: '—',
            portsOpen,
            maxSpeed: `${power} kW`,
            price: tags.fee === 'yes' ? '₹18/kWh' : tags.fee === 'no' ? 'Free' : '₹15/kWh',
            connectors,
            status: status === 'charging' ? 'busy' : status,
            lat: el.lat,
            lng: el.lon,
            _source: 'nextcharge'
          });
        }
      });
      return stations;
    } catch (err) {
      console.error('Error parsing element data:', err);
      return [];
    }
  }, []);

  // ─── OpenStreetMap / OSRM Router ──────────────────────────────────────────
  const fetchOSMRoute = useCallback(async (startLng, startLat, destLng, destLat) => {
    try {
      const r = await apiCall('/google/route', {
        method: 'POST',
        body: {
          start: { lat: startLat, lng: startLng },
          destination: { lat: destLat, lng: destLng }
        }
      });
      if (!r.ok || !r.data?.data) return null;
      return {
        geometry: r.data.data.geometry,
        distance: r.data.data.distance,
        duration: r.data.data.duration,
      };
    } catch (err) {
      console.error('fetchOSMRoute error:', err);
      return null;
    }
  }, []);

  // ─── ABRP EV Routing Simulation Algorithm ──────────────────────────────────
  const planEVRoute = useCallback(async (params) => {
    const {
      start,      // { name, lat, lng }
      destination,// { name, lat, lng }
      vehicle,    // { batteryCapacity, consumption }
      initialSoC, // e.g. 100
      targetSoC,  // e.g. 20
      minStopSoC, // e.g. 10
    } = params;

    const batteryCap = parseFloat(vehicle.batteryCapacity);
    const consumption = parseFloat(vehicle.consumption);
    
    // SoC decrease per meter traveled
    const socPerMeter = (consumption / (batteryCap * 1000000)) * 100;

    const baseRoute = await fetchOSMRoute(start.lng, start.lat, destination.lng, destination.lat);
    if (!baseRoute) throw new Error("Could not find a driving route between the selected locations.");

    const coords = baseRoute.geometry.coordinates;
    
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    coords.forEach(([lng, lat]) => {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    });

    const buffer = 0.08;
    const chargers = await fetchOSMChargingStations({
      south: minLat - buffer,
      west: minLng - buffer,
      north: maxLat + buffer,
      east: maxLng + buffer,
    });

    const dbStations = await searchStations('').catch(() => []) || [];
    const allCandidateStations = [...dbStations, ...chargers];

    const seenIds = new Set();
    const uniqueCandidates = [];
    allCandidateStations.forEach(s => {
      const key = `${s.lat.toFixed(4)}_${s.lng.toFixed(4)}`;
      if (!seenIds.has(s._id) && !seenIds.has(key)) {
        seenIds.add(s._id);
        seenIds.add(key);
        uniqueCandidates.push(s);
      }
    });

    const getDistMeters = (lat1, lon1, lat2, lon2) => {
      const R = 6371e3;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    let currentSoC = initialSoC;
    let stops = [];
    let pathIndex = 0;
    
    let socProfile = [{ distance: 0, soc: initialSoC }];
    let cumulativeDist = 0;
    let initialSoCLocal = initialSoC;

    for (let i = 1; i < coords.length; i++) {
      const [lng1, lat1] = coords[i - 1];
      const [lng2, lat2] = coords[i];
      const segmentDist = getDistMeters(lat1, lng1, lat2, lng2);
      
      cumulativeDist += segmentDist;
      currentSoC -= segmentDist * socPerMeter;

      socProfile.push({ distance: cumulativeDist / 1000, soc: Math.max(0, currentSoC) });

      if (currentSoC <= minStopSoC) {
        let bestStation = null;
        let bestScore = -Infinity;
        let bestStationIndex = i;

        for (let j = Math.max(0, i - 150); j < i; j++) {
          const [rLng, rLat] = coords[j];
          
          for (const station of uniqueCandidates) {
            const distFromRoute = getDistMeters(rLat, rLng, station.lat, station.lng);
            if (distFromRoute > 8000) continue;

            let legDistToStation = 0;
            for (let k = pathIndex + 1; k <= j; k++) {
              legDistToStation += getDistMeters(coords[k-1][1], coords[k-1][0], coords[k][1], coords[k][0]);
            }
            legDistToStation += distFromRoute;

            const actualSocAtStation = initialSoCLocal - (legDistToStation * socPerMeter);

            if (actualSocAtStation < 2) continue;

            const power = parseFloat(station.maxSpeed) || 50;
            const score = (power * 2) - (distFromRoute / 100) + (actualSocAtStation * 1.5);
            
            if (score > bestScore) {
              if (stops.length > 0 && stops[stops.length - 1]._id === station._id) continue;
              bestScore = score;
              bestStation = station;
              bestStationIndex = j;
            }
          }
        }

        if (bestStation) {
          const targetCharge = 80;
          let legDistToStation = 0;
          for (let k = pathIndex + 1; k <= bestStationIndex; k++) {
            legDistToStation += getDistMeters(coords[k-1][1], coords[k-1][0], coords[k][1], coords[k][0]);
          }
          const arrivalSoC = initialSoCLocal - (legDistToStation * socPerMeter);
          const chargeNeeded = targetCharge - arrivalSoC;
          const kwhNeeded = (chargeNeeded / 100) * batteryCap;
          const chargerPower = parseFloat(bestStation.maxSpeed) || 50;
          const chargeTimeMin = Math.round((kwhNeeded / chargerPower) * 60) + 5;

          stops.push({
            ...bestStation,
            arrivalSoC: Math.max(0, Math.round(arrivalSoC)),
            departureSoC: targetCharge,
            chargeTimeMinutes: chargeTimeMin,
            kwhAdded: parseFloat(Math.max(0, kwhNeeded).toFixed(1)),
            cost: Math.round(Math.max(0, kwhNeeded) * 15),
            distanceAlongRouteKm: parseFloat((cumulativeDist / 1000).toFixed(1))
          });

          currentSoC = targetCharge;
          initialSoCLocal = targetCharge;
          pathIndex = bestStationIndex;
          
          socProfile.push({ distance: cumulativeDist / 1000, soc: targetCharge });
        } else {
          break;
        }
      }
    }

    const finalSoc = currentSoC;
    if (finalSoc < targetSoC) {
      if (stops.length > 0) {
        const lastStop = stops[stops.length - 1];
        const deficit = targetSoC - finalSoc;
        const newDepartureSoC = Math.min(95, lastStop.departureSoC + deficit);
        const addedSoC = newDepartureSoC - lastStop.departureSoC;
        const addedKWh = (addedSoC / 100) * batteryCap;
        const chargerPower = parseFloat(lastStop.maxSpeed) || 50;
        
        lastStop.departureSoC = newDepartureSoC;
        lastStop.chargeTimeMinutes += Math.round((addedKWh / chargerPower) * 60);
        lastStop.kwhAdded = parseFloat((lastStop.kwhAdded + addedKWh).toFixed(1));
        lastStop.cost = Math.round(lastStop.kwhAdded * 15);
      }
    }

    let fullCoords = [];
    let legs = [];
    const waypoints = [start, ...stops, destination];
    
    let totalDrivingDuration = 0;
    let totalDistanceMeters = 0;

    for (let i = 0; i < waypoints.length - 1; i++) {
      const legStart = waypoints[i];
      const legEnd = waypoints[i + 1];
      const legRoute = await fetchOSMRoute(legStart.lng, legStart.lat, legEnd.lng, legEnd.lat);
      
      if (legRoute) {
        fullCoords = [...fullCoords, ...legRoute.geometry.coordinates];
        totalDrivingDuration += legRoute.duration;
        totalDistanceMeters += legRoute.distance;
        legs.push({
          distance: legRoute.distance,
          duration: legRoute.duration,
          geometry: legRoute.geometry
        });
      } else {
        fullCoords = [...fullCoords, [legStart.lng, legStart.lat], [legEnd.lng, legEnd.lat]];
      }
    }

    const totalChargingTime = stops.reduce((acc, s) => acc + s.chargeTimeMinutes, 0);
    const totalTripDuration = totalDrivingDuration + (totalChargingTime * 60);
    const totalCost = stops.reduce((acc, s) => acc + s.cost, 0);

    return {
      start,
      destination,
      stops,
      routeGeometry: {
        type: 'LineString',
        coordinates: fullCoords
      },
      socProfile,
      summary: {
        totalDistanceKm: parseFloat((totalDistanceMeters / 1000).toFixed(1)),
        totalDrivingTimeMinutes: Math.round(totalDrivingDuration / 60),
        totalChargingTimeMinutes: totalChargingTime,
        totalDurationMinutes: Math.round(totalTripDuration / 60),
        totalCost,
      }
    };
  }, [fetchOSMRoute, fetchOSMChargingStations, searchStations]);

  return (
    <Ctx.Provider value={{ user, token, toasts, showToast, authModal, setAuthModal, bookingModal, setBookingModal, selectedStation, setSelectedStation, backendOnline, login, signup, logout, googleLogin, createBooking, searchStations, fetchNearbyStations, theme, toggleTheme, articleEditorModal, setArticleEditorModal, fetchArticles, fetchArticle, fetchAdminArticles, createArticle, updateArticle, deleteArticle, searchAddressNominatim, fetchOSMChargingStations, fetchOSMRoute, planEVRoute }}>
      {children}
    </Ctx.Provider>
  );
}

