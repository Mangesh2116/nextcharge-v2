import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useApp } from './context';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useCountUp, useScrollReveal, useTiltCard } from './hooks';
import { STATS, STATIONS, FILTER_TABS, CONNECTOR_TYPES, HOW_STEPS } from './data';
import { MagneticButton, btnBase } from './Navbar';

const DirectionsIcon = ({ size = 18 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    <rect x="3" y="3" width="18" height="18" rx="2" transform="rotate(45 12 12)" />
    <path d="M9 15V11a2 2 0 0 1 2-2h3.5" />
    <polyline points="12 6 15 9 12 12" />
  </svg>
);

const LocateIcon = ({ size = 20 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="3" fill="currentColor" />
    <line x1="12" y1="1" x2="12" y2="4" />
    <line x1="12" y1="20" x2="12" y2="23" />
    <line x1="1" y1="12" x2="4" y2="12" />
    <line x1="20" y1="12" x2="23" y2="12" />
  </svg>
);

const RefreshIcon = ({ size = 18 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    <path d="M23 4v6h-6" />
    <path d="M1 20v-6h6" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);


const inpStyle = { width:'100%', background:'var(--glass-bg)', border:'1px solid var(--input-border)', borderRadius:12, padding:'0.75rem 1rem', color:'var(--text)', fontFamily:'inherit', fontSize:'0.9rem', outline:'none', boxSizing:'border-box', transition:'border-color 0.2s, box-shadow 0.2s' };
const secStyle = bg => ({ padding:'5rem 5%', background: bg || 'var(--bg)' });
const tagStyle = { color:'var(--accent)', fontSize:'0.75rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:'0.8rem', textShadow: 'var(--tag-glow)' };
const h2Style = { fontSize:'clamp(1.8rem,4vw,2.8rem)', fontWeight:800, letterSpacing:'-0.03em', color:'var(--text)', marginBottom:'0.8rem', lineHeight:1.15 };

function StatItem({ num, label }) {
  const { ref, formatted } = useCountUp(num);
  return (
    <div ref={ref} style={{ padding:'1.5rem 2rem', textAlign:'center', flex:1, minWidth:140 }}>
      <span style={{ fontSize:'clamp(1.6rem,3vw,2.2rem)', fontWeight:800, color:'var(--accent)', display:'block', letterSpacing:'-0.02em' }}>{formatted}</span>
      <div style={{ fontSize:'0.8rem', color:'var(--muted)', marginTop:4, fontWeight:500 }}>{label}</div>
    </div>
  );
}

export function StatsBar() {
  const r = useScrollReveal();
  return (
    <div ref={r.ref} className={`reveal ${r.visible?'visible':''}`} style={{ display:'flex', flexWrap:'wrap', background:'var(--bg-soft)', borderTop:'1px solid var(--section-border)', borderBottom:'1px solid var(--section-border)' }}>
      {STATS.map((s,i) => <StatItem key={i} num={s.num} label={s.label} />)}
    </div>
  );
}

// ─── Visual SoC Graph Canvas Component ───────────────────────────────────────
function SoCGraph({ socProfile }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !socProfile || socProfile.length === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    const padLeft = 32;
    const padRight = 16;
    const padTop = 16;
    const padBottom = 24;

    const graphWidth = width - padLeft - padRight;
    const graphHeight = height - padTop - padBottom;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    
    for (let pct = 0; pct <= 100; pct += 25) {
      const y = padTop + graphHeight * (1 - pct / 100);
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(width - padRight, y);
      ctx.stroke();
      
      ctx.fillStyle = 'var(--muted)';
      ctx.font = '9px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${pct}%`, padLeft - 6, y + 3);
    }

    const maxDist = socProfile[socProfile.length - 1].distance || 1;

    ctx.beginPath();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'var(--accent)';
    
    socProfile.forEach((p, idx) => {
      const x = padLeft + (p.distance / maxDist) * graphWidth;
      const y = padTop + graphHeight * (1 - p.soc / 100);
      if (idx === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    ctx.beginPath();
    const grad = ctx.createLinearGradient(0, padTop, 0, padTop + graphHeight);
    grad.addColorStop(0, 'rgba(0, 255, 136, 0.25)');
    grad.addColorStop(1, 'rgba(0, 255, 136, 0.01)');
    ctx.fillStyle = grad;

    socProfile.forEach((p, idx) => {
      const x = padLeft + (p.distance / maxDist) * graphWidth;
      const y = padTop + graphHeight * (1 - p.soc / 100);
      if (idx === 0) {
        ctx.moveTo(x, padTop + graphHeight);
        ctx.lineTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.lineTo(padLeft + graphWidth, padTop + graphHeight);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'var(--muted)';
    ctx.font = '9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i <= 4; i++) {
      const val = (maxDist * i) / 4;
      const x = padLeft + (i / 4) * graphWidth;
      ctx.fillText(`${Math.round(val)} km`, x, height - 6);
    }

  }, [socProfile]);

  return (
    <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: '12px 8px 4px', border: '1px solid var(--border)', marginBottom: 14 }}>
      <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 600, marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
        <span>🔋 SoC Profile vs Distance</span>
        <span style={{ color: 'var(--accent)' }}>NextCharge Simulation</span>
      </div>
      <canvas ref={canvasRef} style={{ width: '100%', height: 110, display: 'block' }} />
    </div>
  );
}

const EV_PRESETS = [
  { name: 'Tata Nexon EV Max', batteryCapacity: 40.5, consumption: 145 },
  { name: 'MG ZS EV', batteryCapacity: 50.3, consumption: 155 },
  { name: 'Tesla Model 3 SR+', batteryCapacity: 60.0, consumption: 130 },
  { name: 'BYD Atto 3', batteryCapacity: 60.48, consumption: 160 },
  { name: 'Hyundai Ioniq 5', batteryCapacity: 72.6, consumption: 170 },
  { name: 'Custom EV', batteryCapacity: 40.0, consumption: 150 }
];

// ─── MapLibre Tile URLs ────────────────────────────────────────────────────────
const DARK_TILE_STYLE = {
  version: 8,
  sources: {
    'carto-dark': {
      type: 'raster',
      tiles: ['https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'],
      tileSize: 256,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
    }
  },
  layers: [{ id: 'carto-dark-layer', type: 'raster', source: 'carto-dark', minzoom: 0, maxzoom: 20 }]
};

const LIGHT_TILE_STYLE = {
  version: 8,
  sources: {
    'carto-light': {
      type: 'raster',
      tiles: ['https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png'],
      tileSize: 256,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
    }
  },
  layers: [{ id: 'carto-light-layer', type: 'raster', source: 'carto-light', minzoom: 0, maxzoom: 20 }]
};

// ─── Custom SVG Icon Helpers (return data URL strings) ──────────────────────
const getUserLocSvg = () => `
  <svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 38 38">
    <circle cx="19" cy="19" r="16" fill="none" stroke="#3B82F6" stroke-width="1.5" opacity="0.15" />
    <circle cx="19" cy="19" r="11" fill="none" stroke="#3B82F6" stroke-width="1.5" opacity="0.3" />
    <circle cx="19" cy="19" r="18" fill="rgba(59,130,246,0.12)" />
    <circle cx="19" cy="19" r="13" fill="rgba(59,130,246,0.22)" />
    <circle cx="19" cy="20" r="7" fill="rgba(10,14,23,0.3)" />
    <circle cx="19" cy="19" r="7" fill="url(#blueDotGrad)" stroke="#ffffff" stroke-width="2" />
    <defs>
      <radialGradient id="blueDotGrad" cx="35%" cy="35%" r="65%">
        <stop offset="0%" stop-color="#60A5FA" />
        <stop offset="70%" stop-color="#2563EB" />
        <stop offset="100%" stop-color="#1D4ED8" />
      </radialGradient>
    </defs>
  </svg>
`;

const getMarkerSvg = (status, isActive) => {
  const color = status === 'available' ? '#10B981' : status === 'busy' ? '#F59E0B' : '#EF4444';
  const bg = isActive ? '#ffffff' : '#151C2C';
  const strokeColor = color;
  const boltColor = isActive ? color : '#ffffff';
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="42" viewBox="0 0 36 42">
      <path d="M18,40 C18,40 34,29.5 34,18 C34,8.5 27.5,2 18,2 C8.5,2 2,8.5 2,18 C2,29.5 18,40 18,40 Z" fill="rgba(10,14,23,0.25)" transform="translate(0, 2)" />
      <path d="M18,2 C27.5,2 34,8.5 34,18 C34,29.5 18,40 18,40 C18,40 2,29.5 2,18 C2,8.5 8.5,2 18,2 Z" fill="${bg}" stroke="${strokeColor}" stroke-width="2.5" />
      ${isActive ? `<circle cx="18" cy="17" r="9" fill="${bg}" />` : ''}
      <path d="M18,8 L12,19 H17 L15,30 L24,16 H19 Z" fill="${boltColor}" />
    </svg>
  `;
};

const getStartSvg = () => `
  <svg xmlns="http://www.w3.org/2000/svg" width="36" height="42" viewBox="0 0 36 42">
    <path d="M18,40 C18,40 34,29.5 34,18 C34,8.5 27.5,2 18,2 C8.5,2 2,8.5 2,18 C2,29.5 18,40 18,40 Z" fill="rgba(10,14,23,0.3)" transform="translate(0, 2)" />
    <path d="M18,2 C27.5,2 34,8.5 34,18 C34,29.5 18,40 18,40 C18,40 2,29.5 2,18 C2,8.5 8.5,2 18,2 Z" fill="#10B981" stroke="#ffffff" stroke-width="2.5" />
    <circle cx="18" cy="17" r="8" fill="#ffffff" />
    <path d="M18,11 L22.5,21 L18,19.5 L13.5,21 Z" fill="#10B981" />
  </svg>
`;

const getDestSvg = () => `
  <svg xmlns="http://www.w3.org/2000/svg" width="36" height="42" viewBox="0 0 36 42">
    <path d="M18,40 C18,40 34,29.5 34,18 C34,8.5 27.5,2 18,2 C8.5,2 2,8.5 2,18 C2,29.5 18,40 18,40 Z" fill="rgba(10,14,23,0.3)" transform="translate(0, 2)" />
    <path d="M18,2 C27.5,2 34,8.5 34,18 C34,29.5 18,40 18,40 C18,40 2,29.5 2,18 C2,8.5 8.5,2 18,2 Z" fill="#EF4444" stroke="#ffffff" stroke-width="2.5" />
    <circle cx="18" cy="17" r="8" fill="#ffffff" />
    <line x1="14" y1="11" x2="14" y2="23" stroke="#334155" stroke-width="1.5" stroke-linecap="round" />
    <rect x="14" y="11" width="3" height="3" fill="#000000" />
    <rect x="17" y="11" width="3" height="3" fill="#ffffff" />
    <rect x="20" y="11" width="3" height="3" fill="#000000" />
    <rect x="14" y="14" width="3" height="3" fill="#ffffff" />
    <rect x="17" y="14" width="3" height="3" fill="#000000" />
    <rect x="20" y="14" width="3" height="3" fill="#ffffff" />
    <rect x="14" y="11" width="9" height="6" fill="none" stroke="#334155" stroke-width="0.5" />
  </svg>
`;

const getStopSvg = (index) => `
  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="46" viewBox="0 0 40 46">
    <path d="M20,44 C20,44 37,32 37,19 C37,8.5 30,2 20,2 C10,2 3,8.5 3,19 C3,32 20,44 20,44 Z" fill="rgba(10,14,23,0.3)" transform="translate(0, 2)" />
    <path d="M20,2 C30,2 37,9 37,19 C37,31 20,44 20,44 C20,44 3,31 3,19 C3,9 10,2 20,2 Z" fill="#3B82F6" stroke="#ffffff" stroke-width="2.5" />
    <circle cx="20" cy="18" r="9" fill="#ffffff" />
    <path d="M20,9 L14,19 H19 L17,27 L25,16 H20 Z" fill="#3B82F6" />
    <circle cx="31" cy="9" r="8.5" fill="#EF4444" stroke="#ffffff" stroke-width="1.5" />
    <text x="31" y="12" font-family="'Inter', -apple-system, sans-serif" font-size="9" font-weight="900" fill="#ffffff" text-anchor="middle">${index + 1}</text>
  </svg>
`;

// Helper: create a DOM element from SVG string for MapLibre markers
function svgToElement(svgString, width, height) {
  const el = document.createElement('div');
  el.innerHTML = svgString;
  el.style.width = width + 'px';
  el.style.height = height + 'px';
  el.style.cursor = 'pointer';
  return el;
}

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

// Format duration in seconds to human-readable form (d, hr, min, sec)
function formatDuration(totalSeconds) {
  if (totalSeconds === undefined || totalSeconds === null || totalSeconds <= 0) return '0 min';
  const d = Math.floor(totalSeconds / (24 * 3600));
  const h = Math.floor((totalSeconds % (24 * 3600)) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.round(totalSeconds % 60);

  const parts = [];
  if (d > 0) parts.push(`${d} day${d > 1 ? 's' : ''}`);
  if (h > 0) parts.push(`${h} hr${h > 1 ? 's' : ''}`);
  if (m > 0) parts.push(`${m} min${m > 1 ? 's' : ''}`);
  if (s > 0) parts.push(`${s} sec`);
  
  if (parts.length === 0) return '0 min';
  return parts.join(' ');
}


export function MapSection({ onSearch, apiStations = [], onStationsChange }) {
  const { 
    setSelectedStation, 
    setBookingModal, 
    user, 
    setAuthModal, 
    showToast, 
    fetchNearbyStations,
    searchAddressNominatim,
    fetchOSMChargingStations,
    planEVRoute,
    theme,
    blockStation,
    fetchStationReviews,
    submitStationReview
  } = useApp();

  // Core Exploration States
  const [query, setQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [mapplsStations, setMapplsStations] = useState([]);
  const [mapplsLoading, setMapplsLoading] = useState(false);
  const [osmStations, setOsmStations] = useState([]);
  const [osmLoading, setOsmLoading] = useState(false);

  // Review States
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [newReviewForm, setNewReviewForm] = useState({ rating: 5, title: '', body: '' });
  const [reviewSubmitLoading, setReviewSubmitLoading] = useState(false);



  // Tab State
  const [sidebarTab, setSidebarTab] = useState('explore'); // 'explore' | 'route'

  // Route Planning States
  const [startInput, setStartInput] = useState('');
  const [destInput, setDestInput] = useState('');
  const [startSuggestions, setStartSuggestions] = useState([]);
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [startPlace, setStartPlace] = useState(null);
  const [destPlace, setDestPlace] = useState(null);
  
  const [vehicleIdx, setVehicleIdx] = useState(0);
  const [customBattery, setCustomBattery] = useState('40.0');
  const [customConsumption, setCustomConsumption] = useState('150');
  
  const [initialSoC, setInitialSoC] = useState(100);
  const [targetSoC, setTargetSoC] = useState(20);
  const [minStopSoC, setMinStopSoC] = useState(12);

  const [routeLoading, setRouteLoading] = useState(false);
  const [routeData, setRouteData] = useState(null);
  const [routingError, setRoutingError] = useState('');

  // Active Station Pin
  const baseStations = useMemo(() => [
    ...osmStations, 
    ...mapplsStations, 
    ...apiStations
  ], [osmStations, mapplsStations, apiStations]);
  const finalCandidates = baseStations;

  useEffect(() => {
    if (onStationsChange) {
      onStationsChange(baseStations);
    }
  }, [baseStations, onStationsChange]);

  const [activePin, setActivePin] = useState(null);

  useEffect(() => {
    if (activePin) {
      setReviewsLoading(true);
      fetchStationReviews(activePin._id)
        .then(data => setReviews(data))
        .catch(() => setReviews([]))
        .finally(() => setReviewsLoading(false));
    } else {
      setReviews([]);
    }
  }, [activePin, fetchStationReviews]);

  // Autocomplete debouncing hooks
  useEffect(() => {
    if (!startInput.trim() || startPlace?.name === startInput) {
      setStartSuggestions([]);
      return;
    }
    const timeout = setTimeout(async () => {
      const res = await searchAddressNominatim(startInput);
      setStartSuggestions(res);
    }, 600);
    return () => clearTimeout(timeout);
  }, [startInput, startPlace, searchAddressNominatim]);

  useEffect(() => {
    if (!destInput.trim() || destPlace?.name === destInput) {
      setDestSuggestions([]);
      return;
    }
    const timeout = setTimeout(async () => {
      const res = await searchAddressNominatim(destInput);
      setDestSuggestions(res);
    }, 600);
    return () => clearTimeout(timeout);
  }, [destInput, destPlace, searchAddressNominatim]);

  useEffect(() => {
    const defaultCandidates = baseStations;
    if (defaultCandidates.length > 0) {
      if (!activePin || !defaultCandidates.some(s => s._id === activePin._id)) {
        setActivePin(defaultCandidates[0]);
      }
    } else {
      setActivePin(null);
    }
  }, [baseStations, activePin]);

  const [focusSearch, setFocusSearch] = useState(false);
  const [filter, setFilter] = useState('All');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [userLoc, setUserLoc] = useState(null);
  const rev = useScrollReveal();

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersGroupRef = useRef([]);
  const routeMarkersRef = useRef([]);
  const userLocMarkerRef = useRef(null);

  const fetchTimeoutRef = useRef(null);


  const handleBook = () => {
    if (!user) { setAuthModal('login'); return; }
    setSelectedStation(activePin);
    setBookingModal(true);
  };

  const handleBlockActiveStation = async () => {
    if (!activePin) return;
    const confirm = window.confirm(`Are you sure you want to block/remove the station "${activePin.name}"?`);
    if (!confirm) return;

    try {
      await blockStation(activePin._id, 'Fake or inaccurate details reported by admin');
      showToast(`Station "${activePin.name}" blocked successfully and hidden.`, 'success');
      setMapplsStations(prev => prev.filter(s => s._id !== activePin._id));
      setOsmStations(prev => prev.filter(s => s._id !== activePin._id));
      setActivePin(null);
    } catch (err) {
      showToast(err.message || 'Failed to remove station', 'error');
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      showToast('Please sign in to write a review', 'warning');
      setAuthModal('login');
      return;
    }
    if (!newReviewForm.body.trim()) {
      showToast('Please write a comment', 'warning');
      return;
    }
    setReviewSubmitLoading(true);
    try {
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(activePin._id);
      const payload = {
        rating: newReviewForm.rating,
        title: newReviewForm.title || 'Review',
        body: newReviewForm.body,
        stationId: isObjectId ? activePin._id : undefined,
        googlePlaceId: !isObjectId ? activePin._id : undefined,
        stationName: activePin.name,
        stationAddress: activePin.address
      };
      
      const review = await submitStationReview(payload);
      showToast('Review submitted successfully!', 'success');
      
      setReviews(prev => [
        { ...review, user: { name: user.name, avatar: user.avatar } },
        ...prev
      ]);
      setNewReviewForm({ rating: 5, title: '', body: '' });
    } catch (err) {
      showToast(err.message || 'Failed to submit review', 'error');
    } finally {
      setReviewSubmitLoading(false);
    }
  };

  const loadMapplsStations = useCallback(async (lat, lng, radius = 10000) => {
    setMapplsLoading(true);
    try {
      const stations = await fetchNearbyStations(lat, lng, radius);
      if (stations && stations.length > 0) {
        setMapplsStations(stations);
      }
    } catch (e) {
      console.warn('Mappls fetch failed');
    } finally {
      setMapplsLoading(false);
    }
  }, [fetchNearbyStations]);

  const loadOSMStations = useCallback(async (lat, lng, radius = 10000) => {
    setOsmLoading(true);
    try {
      const stations = await fetchOSMChargingStations({ lat, lng, radius });
      if (stations && stations.length > 0) {
        setOsmStations(stations);
      }
    } catch (e) {
      console.warn('OSM Overpass fetch failed');
    } finally {
      setOsmLoading(false);
    }
  }, [fetchOSMChargingStations]);

  // MapLibre is always ready (no external script to wait for)
  useEffect(() => {
    setMapLoaded(true);
  }, []);

  const locateUser = (zoomIn = true) => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser', 'error');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLoc({ lat: latitude, lng: longitude });

        loadMapplsStations(latitude, longitude, 10000);
        loadOSMStations(latitude, longitude, 10000);

        if (mapInstanceRef.current) {
          if (zoomIn) {
            mapInstanceRef.current.flyTo({ center: [longitude, latitude], zoom: 14 });
          }

          if (userLocMarkerRef.current) {
            userLocMarkerRef.current.setLngLat([longitude, latitude]);
          } else {
            const el = svgToElement(getUserLocSvg(), 38, 38);
            userLocMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'center' })
              .setLngLat([longitude, latitude])
              .addTo(mapInstanceRef.current);
          }

          if (zoomIn) {
            showToast('Located! Fetching real-time chargers nearby', 'success');
          }
        }
      },
      (error) => {
        if (zoomIn) {
          let msg = 'Enable location permissions to find nearby chargers';
          if (error.code === 1) {
            msg = 'Location permission denied. Please allow settings.';
          } else if (error.code === 2) {
            msg = 'Location unavailable.';
          } else if (error.code === 3) {
            msg = 'Location timed out.';
          }
          showToast(msg, 'warning');
        }
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    );
  };

  const handleUseCurrentLocation = () => {
    if (userLoc) {
      setStartPlace({
        name: 'Current Location',
        lat: userLoc.lat,
        lng: userLoc.lng
      });
      setStartInput('Current Location');
      showToast('Start set to current location', 'success');
    } else {
      if (!navigator.geolocation) {
        showToast('Geolocation is not supported by your browser', 'error');
        return;
      }
      showToast('Locating current position...', 'info');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLoc({ lat: latitude, lng: longitude });
          setStartPlace({
            name: 'Current Location',
            lat: latitude,
            lng: longitude
          });
          setStartInput('Current Location');
          showToast('Start set to current location', 'success');
        },
        () => {
          showToast('Could not access location. Please type manually.', 'error');
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
      );
    }
  };

  const renderMarkers = useCallback(() => {
    if (!mapInstanceRef.current || !mapLoaded) return;

    // Clear existing station markers
    if (markersGroupRef.current && markersGroupRef.current.length > 0) {
      markersGroupRef.current.forEach(m => m.remove());
    }
    markersGroupRef.current = [];

    // Clear existing route markers
    if (routeMarkersRef.current && routeMarkersRef.current.length > 0) {
      routeMarkersRef.current.forEach(m => m.remove());
    }
    routeMarkersRef.current = [];

    // 1. Render Route start, destination, and charging stops (if active)
    if (sidebarTab === 'route' && routeData) {
      // Start Marker
      const startEl = svgToElement(getStartSvg(), 36, 42);
      const startPopup = new maplibregl.Popup({ offset: [0, -42], closeButton: false })
        .setHTML(`<div style="color: #0F172A;"><strong>Start Position</strong><br/>${routeData.start.name}</div>`);
      const startMarker = new maplibregl.Marker({ element: startEl, anchor: 'bottom' })
        .setLngLat([routeData.start.lng, routeData.start.lat])
        .setPopup(startPopup)
        .addTo(mapInstanceRef.current);
      routeMarkersRef.current.push(startMarker);

      // Destination Marker
      const destEl = svgToElement(getDestSvg(), 36, 42);
      const destPopup = new maplibregl.Popup({ offset: [0, -42], closeButton: false })
        .setHTML(`<div style="color: #0F172A;"><strong>Destination</strong><br/>${routeData.destination.name}</div>`);
      const destMarker = new maplibregl.Marker({ element: destEl, anchor: 'bottom' })
        .setLngLat([routeData.destination.lng, routeData.destination.lat])
        .setPopup(destPopup)
        .addTo(mapInstanceRef.current);
      routeMarkersRef.current.push(destMarker);

      // Stops Markers
      routeData.stops.forEach((stop, index) => {
        const stopEl = svgToElement(getStopSvg(index), 40, 46);
        const popupContent = `
          <div style="font-family: 'Inter', sans-serif; padding: 4px; min-width: 170px; color: #0F172A;">
            <strong style="color: #3B82F6; font-size: 0.82rem;">⚡ Stop #${index + 1}: ${stop.name}</strong>
            <div style="font-size: 0.7rem; color: #64748B; margin-top: 3px;">📍 ${stop.address}</div>
            <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 5px 0;" />
            <div style="display: flex; justify-content: space-between; font-size: 0.7rem; margin-bottom: 2px;">
              <span>Charge Level:</span>
              <strong>${stop.arrivalSoC}% ➔ ${stop.departureSoC}%</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.7rem; margin-bottom: 2px;">
              <span>Time Required:</span>
              <strong style="color: #059669;">${stop.chargeTimeMinutes} mins</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.7rem;">
              <span>Estimated Cost:</span>
              <strong>₹${stop.cost}</strong>
            </div>
          </div>
        `;
        const stopPopup = new maplibregl.Popup({ offset: [0, -46], closeButton: false })
          .setHTML(popupContent);
        const stopMarker = new maplibregl.Marker({ element: stopEl, anchor: 'bottom' })
          .setLngLat([stop.lng, stop.lat])
          .setPopup(stopPopup)
          .addTo(mapInstanceRef.current);
        stopEl.addEventListener('click', () => setActivePin(stop));
        routeMarkersRef.current.push(stopMarker);
      });
    }

    // 2. Render all background candidate charging station markers (always visible)
    const filtered = finalCandidates.filter(s => {
      if (filter === 'Available Only') return s.status === 'available';
      if (filter === 'Fast DC') return s.maxSpeed && parseFloat(s.maxSpeed) >= 30;
      return true;
    });

    filtered.forEach(s => {
      const active = activePin && activePin._id === s._id;
      const el = svgToElement(getMarkerSvg(s.status, active), 36, 42);

      const popupContent = `
        <div style="font-family: 'Inter', sans-serif; padding: 4px; min-width: 180px; color: #0F172A;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
            <span style="font-size: 14px;">${s.icon || '⚡'}</span>
            <strong style="color: #0F172A; font-size: 0.88rem;">${s.name}</strong>
          </div>
          <div style="font-size: 0.72rem; color: #64748B; margin-bottom: 6px;">📍 ${s.address}</div>
          <div style="display: flex; gap: 6px; font-size: 0.68rem; margin-bottom: 4px;">
            <span style="background: ${s.status === 'available' ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)'}; color: ${s.status === 'available' ? '#059669' : '#D97706'}; padding: 1px 5px; border-radius: 4px; font-weight: 700;">
              ${s.status === 'available' ? 'Available' : s.status === 'busy' ? 'Busy' : 'Offline'}
            </span>
            <span style="background: #F1F5F9; color: #334155; padding: 1px 5px; border-radius: 4px; font-weight: 600;">
              ⚡ ${s.maxSpeed || '50 kW'}
            </span>
          </div>
          <div style="font-size: 0.60rem; color: #94A3B8; margin-top: 4px; font-weight: 500;">Source: ${s._source === 'mappls' ? 'Mappls' : 'NextCharge'} Network</div>
        </div>
      `;

      const popup = new maplibregl.Popup({ offset: [0, -42], closeButton: false })
        .setHTML(popupContent);

      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([s.lng, s.lat])
        .setPopup(popup)
        .addTo(mapInstanceRef.current);

      el.addEventListener('click', () => {
        setActivePin(s);
        mapInstanceRef.current.panTo([s.lng, s.lat]);
      });

      markersGroupRef.current.push(marker);
    });
  }, [filter, activePin, finalCandidates, sidebarTab, routeData, mapLoaded]);

  // Map Initialization Effect
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || mapInstanceRef.current) return;

    const map = new maplibregl.Map({
      container: mapRef.current,
      style: theme === 'light' ? LIGHT_TILE_STYLE : DARK_TILE_STYLE,
      center: [72.8656, 19.0596],
      zoom: 11.5,
      attributionControl: true
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left');

    mapInstanceRef.current = map;

    map.on('load', () => {
      renderMarkers();
      loadMapplsStations(19.0596, 72.8656, 10000);
      loadOSMStations(19.0596, 72.8656, 10000);
      locateUser(false);
    });

    const onMoveEnd = () => {
      if (sidebarTab === 'route' && routeData) return;
      clearTimeout(fetchTimeoutRef.current);
      fetchTimeoutRef.current = setTimeout(() => {
        const center = map.getCenter();
        const bounds = map.getBounds();
        if (!bounds) return;
        const ne = bounds.getNorthEast();
        const diagMeters = getDistanceMeters(center.lat, center.lng, ne.lat, ne.lng);
        const radius = Math.min(Math.max(diagMeters, 2000), 12000);
        loadMapplsStations(center.lat, center.lng, Math.round(radius));
        loadOSMStations(center.lat, center.lng, Math.round(radius));
      }, 300);
    };

    map.on('moveend', onMoveEnd);

    return () => {
      map.off('moveend', onMoveEnd);
      clearTimeout(fetchTimeoutRef.current);
      if (userLocMarkerRef.current) {
        userLocMarkerRef.current.remove();
        userLocMarkerRef.current = null;
      }
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [mapLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Route Polyline Draw Effect
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    // Remove existing route layer and source
    if (map.getLayer('route-line')) map.removeLayer('route-line');
    if (map.getSource('route-source')) map.removeSource('route-source');

    if (sidebarTab === 'route' && routeData && routeData.routeGeometry) {
      // Wait for map style to load if needed
      const addRoute = () => {
        if (map.getSource('route-source')) return; // already added
        map.addSource('route-source', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: routeData.routeGeometry
          }
        });
        map.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route-source',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': theme === 'light' ? '#10B981' : '#00FF88',
            'line-width': 6,
            'line-opacity': 0.85
          }
        });

        // Fit bounds
        const coords = routeData.routeGeometry.coordinates;
        const lngLats = coords.map(([lng, lat]) => [lng, lat]);
        const bounds = lngLats.reduce((b, coord) => b.extend(coord), new maplibregl.LngLatBounds(lngLats[0], lngLats[0]));
        map.fitBounds(bounds, { padding: 50 });
      };

      if (map.isStyleLoaded()) {
        addRoute();
      } else {
        map.once('styledata', addRoute);
      }
    }
  }, [routeData, sidebarTab, theme]);

  useEffect(() => {
    if (mapInstanceRef.current) {
      renderMarkers();
    }
  }, [filter, activePin, finalCandidates, sidebarTab, routeData, renderMarkers]);

  // Theme switching effect
  useEffect(() => {
    if (mapInstanceRef.current) {
      const map = mapInstanceRef.current;
      const center = map.getCenter();
      const zoom = map.getZoom();
      map.setStyle(theme === 'light' ? LIGHT_TILE_STYLE : DARK_TILE_STYLE);
      // Re-render markers and re-add route after style change
      map.once('styledata', () => {
        map.setCenter(center);
        map.setZoom(zoom);
        renderMarkers();
      });
    }
  }, [theme, renderMarkers]);

  const handleSearchLocation = async (queryText) => {
    if (!queryText.trim()) return;
    setSearchLoading(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryText)}&countrycodes=in`);
      const data = await res.json();
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const targetLat = parseFloat(lat);
        const targetLng = parseFloat(lon);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo({ center: [targetLng, targetLat], zoom: 12.5 });
        }

        await loadMapplsStations(targetLat, targetLng, 10000);
        await loadOSMStations(targetLat, targetLng, 10000);
        showToast(`Showing chargers near ${display_name.split(',')[0]}`, 'success');
      } else {
        showToast('Location not found in India', 'warning');
      }
    } catch {
      showToast('Search error. Please try again.', 'error');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    handleSearchLocation(query);
    onSearch(query);
  };

  const handleRefreshStations = () => {
    if (!mapInstanceRef.current) return;
    const center = mapInstanceRef.current.getCenter();
    loadMapplsStations(center.lat, center.lng, 10000);
    loadOSMStations(center.lat, center.lng, 10000);
    showToast('Refreshing nearby chargers...', 'info');
  };


  const handlePlanRoute = async () => {
    if (!startPlace || !destPlace) {
      showToast('Please select both start and destination points', 'warning');
      return;
    }
    setRouteLoading(true);
    setRoutingError('');
    try {
      const isCustom = EV_PRESETS[vehicleIdx].name === 'Custom EV';
      const batteryVal = isCustom ? customBattery : EV_PRESETS[vehicleIdx].batteryCapacity;
      const consumptionVal = isCustom ? customConsumption : EV_PRESETS[vehicleIdx].consumption;

      const res = await planEVRoute({
        start: startPlace,
        destination: destPlace,
        vehicle: {
          batteryCapacity: batteryVal,
          consumption: consumptionVal
        },
        initialSoC,
        targetSoC,
        minStopSoC
      });

      setRouteData(res);
      showToast('Route generated successfully!', 'success');
    } catch (e) {
      console.error(e);
      setRoutingError(e.message || 'Routing failed. Please verify your endpoints.');
      showToast('Could not calculate EV route', 'error');
    } finally {
      setRouteLoading(false);
    }
  };

  const clearPlannedRoute = () => {
    setRouteData(null);
    setStartPlace(null);
    setDestPlace(null);
    setStartInput('');
    setDestInput('');
    setRoutingError('');
    if (mapInstanceRef.current && userLoc) {
      mapInstanceRef.current.flyTo({ center: [userLoc.lng, userLoc.lat], zoom: 11.5 });
    }
  };

  return (
    <section id="find" ref={rev.ref} className={`reveal ${rev.visible?'visible':''}`} style={{ ...secStyle('var(--bg-soft)'), textAlign:'center' }}>
      <div style={tagStyle}>Live Tracking</div>
      <h2 style={h2Style}>Real-time EV Charging Map</h2>
      <p style={{ color:'var(--muted)', maxWidth:520, margin:'0 auto 2.5rem', lineHeight:1.7, fontSize:'0.95rem' }}>
        Locate live chargers, plan road trips with optimal charging stops, and lock your slot instantly.
      </p>

      {/* Geocoding Search Input */}
      <form onSubmit={handleSearchSubmit} style={{ display:'flex', maxWidth:600, margin:'0 auto 2.2rem', background:'var(--surface)', border: focusSearch ? '1.5px solid var(--accent)' : '1.5px solid var(--input-border)', borderRadius:60, padding:'0.35rem 0.35rem 0.35rem 1.3rem', alignItems:'center', gap:'0.8rem', boxShadow: focusSearch ? 'var(--shadow-glow), var(--neon-glow)' : 'var(--shadow-md)', transition:'all 0.25s' }}>
        <span>🔍</span>
        <input value={query} onChange={e=>setQuery(e.target.value)} onFocus={()=>setFocusSearch(true)} onBlur={()=>setFocusSearch(false)} placeholder="Search city (e.g. Mumbai, Vashi, Worli)..." style={{ flex:1, background:'none', border:'none', outline:'none', color:'var(--text)', fontFamily:'inherit', fontSize:'0.92rem' }} />
        <button type="submit" disabled={searchLoading} style={btnBase('primary',{padding:'0.65rem 1.4rem',borderRadius:50,fontSize:'0.85rem',opacity:searchLoading?0.7:1})}>
          {searchLoading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {/* Main Map + Dashboard container */}
      <div style={{ maxWidth:1100, margin:'0 auto', background:'var(--surface)', border:'1px solid var(--glass-border)', borderRadius:24, overflow:'hidden', boxShadow:'var(--shadow-xl)', display:'flex', flexWrap:'wrap', minHeight:580 }}>
        
        {/* Left column: Leaflet Map */}
        <div style={{ flex: '1 1 60%', minWidth: 320, height: 580, position: 'relative' }}>
          <div ref={mapRef} style={{ width: '100%', height: '100%', background: 'var(--bg)' }} />
          
          {/* Floating Action Buttons */}
          <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button 
              type="button"
              onClick={() => locateUser(true)}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                width: 42,
                height: 42,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-md)',
                cursor: 'pointer',
                color: 'var(--text)',
                transition: 'all 0.2s ease-in-out',
                outline: 'none'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'scale(1.06)';
                e.currentTarget.style.color = '#1a73e8';
                e.currentTarget.style.borderColor = 'rgba(26, 115, 232, 0.4)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.color = 'var(--text)';
                e.currentTarget.style.borderColor = 'var(--border)';
              }}
              title="Locate Me"
            >
              <LocateIcon size={20} />
            </button>
            <button 
              type="button"
              onClick={handleRefreshStations}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                width: 42,
                height: 42,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-md)',
                cursor: 'pointer',
                color: 'var(--text)',
                transition: 'all 0.2s ease-in-out',
                outline: 'none',
                animation: (mapplsLoading || osmLoading) ? 'spin 1s linear infinite' : 'none'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'scale(1.06)';
                e.currentTarget.style.color = '#1a73e8';
                e.currentTarget.style.borderColor = 'rgba(26, 115, 232, 0.4)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.color = 'var(--text)';
                e.currentTarget.style.borderColor = 'var(--border)';
              }}
              title="Refresh Stations"
            >
              <RefreshIcon size={18} />
            </button>
          </div>

          {/* OSM / Mappls Loading Indicator */}
          {(mapplsLoading || osmLoading) && (
            <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(10px)', padding: '6px 16px', borderRadius: 20, border: '1px solid var(--border-accent)', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: 'var(--accent)', fontWeight: 600 }}>
              <div style={{ width: 14, height: 14, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              Loading live chargers...
            </div>
          )}

          {/* Powered by OpenStreetMap / Mappls badge */}
          <div style={{ position: 'absolute', bottom: 12, right: 12, zIndex: 1000, background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(10px)', padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
            ⚡ NextCharge Live Network · {finalCandidates.length} Active Stations
          </div>

          {/* Floating EV Filters */}
          <div style={{ position: 'absolute', bottom: 12, left: 12, zIndex: 1000, display: 'flex', gap: 6, background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(10px)', padding: '4px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
            {['All', 'Available Only', 'Fast DC'].map((f) => {
              const active = filter === f;
              return (
                <button
                  type="button"
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    background: active ? 'var(--accent)' : 'transparent',
                    border: 'none',
                    borderRadius: 8,
                    padding: '6px 12px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: active ? '#0A0E17' : 'rgba(255,255,255,0.7)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    outline: 'none'
                  }}
                >
                  {f}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right column: Interactive Side Panel (Explore vs Route Planner) */}
        <div style={{ flex: '1 1 40%', minWidth: 320, background: 'var(--bg-alt)', borderLeft: '1px solid var(--glass-border)', padding: '1.4rem', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', overflowY: 'auto', maxHeight: 580 }}>
          
          {/* Tab Switcher */}
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.15)', borderRadius: 12, padding: '4px', marginBottom: '1.2rem' }}>
            <button
              onClick={() => setSidebarTab('explore')}
              style={{
                flex: 1,
                background: sidebarTab === 'explore' ? 'var(--surface)' : 'transparent',
                border: 'none',
                borderRadius: 8,
                padding: '8px 0',
                color: sidebarTab === 'explore' ? 'var(--text)' : 'var(--muted)',
                fontWeight: 600,
                fontSize: '0.78rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              Explore Chargers
            </button>
            <button
              onClick={() => setSidebarTab('route')}
              style={{
                flex: 1.2,
                background: sidebarTab === 'route' ? 'var(--surface)' : 'transparent',
                border: 'none',
                borderRadius: 8,
                padding: '8px 0',
                color: sidebarTab === 'route' ? 'var(--text)' : 'var(--muted)',
                fontWeight: 600,
                fontSize: '0.78rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="6" cy="6" r="3"></circle>
                <circle cx="18" cy="18" r="3"></circle>
                <path d="M9 6h6a3 3 0 0 1 3 3v6"></path>
              </svg>
              NextCharge Route Planner
            </button>
          </div>

          {/* TAB 1: Explore Chargers Detail View */}
          {sidebarTab === 'explore' && (
            activePin ? (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', width: '100%' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
                    <span style={{ fontSize: '2rem' }}>{activePin.icon || '⚡'}</span>
                    <span style={{
                      background: activePin.status === 'available' ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)',
                      border: activePin.status === 'available' ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(245,158,11,0.2)',
                      color: activePin.status === 'available' ? 'var(--accent)' : '#D97706',
                      padding: '4px 10px',
                      borderRadius: 30,
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      textTransform: 'capitalize'
                    }}>
                      ● {activePin.status}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text)', margin: '0 0 0.4rem', textAlign: 'left', lineHeight: 1.3 }}>{activePin.name}</h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--muted)', margin: '0 0 1.2rem', textAlign: 'left' }}>📍 {activePin.address}</p>

                  {/* Specs Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: '1.4rem' }}>
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px', textAlign: 'left' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 2 }}>Max Speed</div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text)' }}>⚡ {activePin.maxSpeed || '50 kW'}</div>
                    </div>
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px', textAlign: 'left' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 2 }}>Price</div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--accent)' }}>{activePin.price || '₹15/kWh'}</div>
                    </div>
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px', textAlign: 'left' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 2 }}>Ports Open</div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text)' }}>🔌 {activePin.portsOpen || '—'}</div>
                    </div>
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px', textAlign: 'left' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 2 }}>Source</div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase' }}>{activePin._source === 'osm' || activePin._source === 'nextcharge' ? 'NEXTCHARGE' : activePin._source || 'DB'}</div>
                    </div>
                  </div>

                  {/* Supported Connectors */}
                  <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Connectors Supported</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {activePin.connectors && activePin.connectors.map(c => (
                        <span key={c} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 8px', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          🔌 {c}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Reviews Section */}
                  <div style={{ textAlign: 'left', marginTop: '1.8rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem', paddingBottom: '1rem' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text)', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>💬 Reviews & Ratings ({reviews.length})</span>
                      {reviews.length > 0 && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>
                          ★ {(reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)} / 5.0
                        </span>
                      )}
                    </div>

                    {/* Write a Review Form */}
                    <form onSubmit={handleReviewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1rem', marginBottom: '1.2rem' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Share your experience:</div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Rating:</span>
                        {[1, 2, 3, 4, 5].map(num => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setNewReviewForm({ ...newReviewForm, rating: num })}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: newReviewForm.rating >= num ? '#F59E0B' : 'var(--border)',
                              fontSize: '1.2rem',
                              cursor: 'pointer',
                              padding: 0
                            }}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                      <input
                        style={{ ...inpStyle, padding: '0.5rem 0.8rem', fontSize: '0.8rem' }}
                        value={newReviewForm.title}
                        onChange={e => setNewReviewForm({ ...newReviewForm, title: e.target.value })}
                        placeholder="Review title (e.g. Fast charging!)"
                      />
                      <textarea
                        style={{ ...inpStyle, padding: '0.5rem 0.8rem', fontSize: '0.8rem', minHeight: 60, resize: 'vertical' }}
                        value={newReviewForm.body}
                        onChange={e => setNewReviewForm({ ...newReviewForm, body: e.target.value })}
                        placeholder="Write a comment about this station..."
                        required
                      />
                      <button
                        type="submit"
                        disabled={reviewSubmitLoading}
                        style={btnBase('primary', { padding: '0.5rem 1rem', fontSize: '0.78rem', borderRadius: 8, alignSelf: 'flex-end' })}
                      >
                        {reviewSubmitLoading ? 'Submitting...' : 'Submit Review'}
                      </button>
                    </form>

                    {/* Reviews List */}
                    {reviewsLoading ? (
                      <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem 0' }}>
                        <Spin />
                      </div>
                    ) : reviews.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 220, overflowY: 'auto', paddingRight: 4 }}>
                        {reviews.map(r => (
                          <div key={r._id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)' }}>
                                {r.user?.name || 'Anonymous User'}
                              </span>
                              <span style={{ color: '#F59E0B', fontSize: '0.75rem' }}>
                                {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                              </span>
                            </div>
                            {r.title && (
                              <div style={{ fontSize: '0.75rem', fontWeight: 750, color: 'var(--text-secondary)', marginBottom: 2 }}>
                                {r.title}
                              </div>
                            )}
                            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.3 }}>
                              {r.body}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.78rem', padding: '1rem 0' }}>
                        No reviews yet. Be the first to review this station!
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: 8, marginTop: 'auto', width: '100%' }}>
                  {user && user.role === 'admin' && (
                    <button
                      type="button"
                      onClick={handleBlockActiveStation}
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: '#EF4444',
                        border: '1.5px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: 12,
                        padding: '0.75rem 1rem',
                        fontWeight: 600,
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                      }}
                    >
                      ✕ Block Station
                    </button>
                  )}
                  <a 
                    href={`https://www.google.com/maps/dir/?api=1&destination=${activePin.lat},${activePin.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: '#1a73e8',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 12,
                      padding: '0.75rem 1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      textDecoration: 'none',
                      fontWeight: 600,
                      fontSize: '0.88rem',
                      boxShadow: '0 2px 6px rgba(26, 115, 232, 0.3)',
                      transition: 'all 0.2s ease-in-out',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = '#1557b0';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(26, 115, 232, 0.4)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = '#1a73e8';
                      e.currentTarget.style.boxShadow = '0 2px 6px rgba(26, 115, 232, 0.3)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                    title="Get Directions"
                  >
                    <DirectionsIcon size={18} />
                    <span>Directions</span>
                  </a>
                  <button 
                    type="button"
                    onClick={handleBook}
                    style={{ ...btnBase('primary', { flex: 1, padding: '0.75rem', borderRadius: 12, fontSize: '0.88rem' }) }}
                  >
                    ⚡ Book Slot
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)', padding: '2rem 0' }}>
                <div style={{ fontSize: '3rem', marginBottom: '0.8rem' }}>🗺️</div>
                <p style={{ fontSize: '0.88rem' }}>Select a charging station on the map to view details & book slot</p>
              </div>
            )
          )}

          {/* TAB 2: ABRP Route Planner View */}
          {sidebarTab === 'route' && (
            <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 12, textAlign: 'left' }}>
              
              {!routeData && (
                <>
                  <div style={{ fontSize: '1rem', fontWeight: 750, color: 'var(--text)', marginBottom: 4 }}>NextCharge Route Planner</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 8 }}>Input start, destination, and select your EV. We will map optimal charging stops.</div>
                  
                  {/* Start Location Input with Autocomplete */}
                  <div style={{ position: 'relative' }}>
                    <label style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Start Location</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        value={startInput}
                        onChange={e => {
                          setStartInput(e.target.value);
                          if (!e.target.value) setStartPlace(null);
                        }}
                        placeholder="Search starting point..."
                        style={{ ...inpStyle, paddingRight: '2.4rem' }}
                      />
                      <button
                        type="button"
                        onClick={handleUseCurrentLocation}
                        style={{
                          position: 'absolute',
                          right: 10,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: 'var(--accent)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 6,
                          borderRadius: '50%',
                          transition: 'all 0.2s ease',
                          outline: 'none'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = 'rgba(0, 255, 136, 0.15)';
                          e.currentTarget.style.color = '#ffffff';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'none';
                          e.currentTarget.style.color = 'var(--accent)';
                        }}
                        title="Use current location"
                      >
                        <LocateIcon size={15} />
                      </button>
                    </div>
                    {startSuggestions.length > 0 && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, zIndex: 1050, boxShadow: 'var(--shadow-lg)', maxHeight: 200, overflowY: 'auto', marginTop: 4 }}>
                        {startSuggestions.map((place, idx) => (
                          <div
                            key={idx}
                            onClick={() => {
                              setStartPlace(place);
                              setStartInput(place.name);
                              setStartSuggestions([]);
                            }}
                            style={{ padding: '10px 14px', fontSize: '0.78rem', color: 'var(--text)', borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                          >
                            📍 {place.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Destination Location Input with Autocomplete */}
                  <div style={{ position: 'relative' }}>
                    <label style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Destination</label>
                    <input
                      value={destInput}
                      onChange={e => {
                        setDestInput(e.target.value);
                        if (!e.target.value) setDestPlace(null);
                      }}
                      placeholder="Search destination..."
                      style={inpStyle}
                    />
                    {destSuggestions.length > 0 && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, zIndex: 1050, boxShadow: 'var(--shadow-lg)', maxHeight: 200, overflowY: 'auto', marginTop: 4 }}>
                        {destSuggestions.map((place, idx) => (
                          <div
                            key={idx}
                            onClick={() => {
                              setDestPlace(place);
                              setDestInput(place.name);
                              setDestSuggestions([]);
                            }}
                            style={{ padding: '10px 14px', fontSize: '0.78rem', color: 'var(--text)', borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                          >
                            📍 {place.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Vehicle Presets */}
                  <div>
                    <label style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>EV Vehicle Model</label>
                    <select
                      value={vehicleIdx}
                      onChange={e => setVehicleIdx(parseInt(e.target.value))}
                      style={inpStyle}
                    >
                      {EV_PRESETS.map((ev, idx) => (
                        <option key={idx} value={idx}>{ev.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Custom Vehicle Parameters (if Custom selected) */}
                  {EV_PRESETS[vehicleIdx].name === 'Custom EV' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <label style={{ fontSize: '0.68rem', color: 'var(--muted)', display: 'block', marginBottom: 2 }}>Battery Cap (kWh)</label>
                        <input type="number" value={customBattery} onChange={e => setCustomBattery(e.target.value)} style={inpStyle} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.68rem', color: 'var(--muted)', display: 'block', marginBottom: 2 }}>Consumption (Wh/km)</label>
                        <input type="number" value={customConsumption} onChange={e => setCustomConsumption(e.target.value)} style={inpStyle} />
                      </div>
                    </div>
                  )}

                  {/* SoC Config sliders */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 12, border: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: 2 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Initial Battery (SoC)</span>
                        <strong style={{ color: 'var(--accent)' }}>{initialSoC}%</strong>
                      </div>
                      <input type="range" min="20" max="100" value={initialSoC} onChange={e => setInitialSoC(parseInt(e.target.value))} style={{ width: '100%', accentColor: 'var(--accent)' }} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: 2 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Desired Arrival Battery</span>
                        <strong style={{ color: 'var(--accent)' }}>{targetSoC}%</strong>
                      </div>
                      <input type="range" min="10" max="80" value={targetSoC} onChange={e => setTargetSoC(parseInt(e.target.value))} style={{ width: '100%', accentColor: 'var(--accent)' }} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: 2 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Min Charger Stop Limit</span>
                        <strong style={{ color: '#EF4444' }}>{minStopSoC}%</strong>
                      </div>
                      <input type="range" min="5" max="30" value={minStopSoC} onChange={e => setMinStopSoC(parseInt(e.target.value))} style={{ width: '100%', accentColor: 'var(--accent)' }} />
                    </div>
                  </div>

                  {routingError && (
                    <div style={{ color: '#EF4444', fontSize: '0.75rem', fontWeight: 600, padding: 8, background: 'rgba(239,68,68,0.08)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)' }}>
                      ⚠️ {routingError}
                    </div>
                  )}

                  <button
                    onClick={handlePlanRoute}
                    disabled={routeLoading}
                    style={{
                      ...btnBase('primary', {
                        padding: '0.85rem',
                        borderRadius: 14,
                        fontSize: '0.88rem',
                        fontWeight: 700,
                        marginTop: 6,
                        width: '100%',
                        cursor: routeLoading ? 'not-allowed' : 'pointer',
                        boxShadow: '0 4px 14px rgba(0, 255, 136, 0.3)',
                        border: 'none',
                        transition: 'all 0.25s ease'
                      })
                    }}
                    onMouseEnter={e => {
                      if (!routeLoading) {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 255, 136, 0.45)';
                      }
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 14px rgba(0, 255, 136, 0.3)';
                    }}
                  >
                    {routeLoading ? 'Simulating Route Stops...' : '⚡ Calculate EV Route'}
                  </button>
                </>
              )}

              {/* ROUTE RESULTS PANEL */}
              {routeData && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text)' }}>Trip Overview</div>
                    <button
                      onClick={clearPlannedRoute}
                      style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Clear Route
                    </button>
                  </div>

                  {/* Quick summary grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 12, border: '1px solid var(--border)' }}>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>Total Distance</div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text)' }}>🚗 {routeData.summary.totalDistanceKm} km</div>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>Total Cost</div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--accent)' }}>₹{routeData.summary.totalCost}</div>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>Driving Duration</div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text)' }}>⏱️ {formatDuration(routeData.summary.totalDrivingTimeSeconds || (routeData.summary.totalDrivingTimeMinutes * 60))}</div>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>Charging Time</div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#3B82F6' }}>⚡ {formatDuration(routeData.summary.totalChargingTimeSeconds || (routeData.summary.totalChargingTimeMinutes * 60))}</div>
                    </div>
                  </div>

                  {/* SoC profile canvas graph */}
                  <SoCGraph socProfile={routeData.socProfile} />

                  {/* Itinerary / Charging Stops */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)' }}>Planned Charging Stops ({routeData.stops.length})</div>
                    
                    {routeData.stops.length === 0 ? (
                      <div style={{ fontSize: '0.78rem', color: 'var(--muted)', background: 'rgba(255,255,255,0.02)', padding: 10, borderRadius: 8, textAlign: 'center', border: '1px dashed var(--border)' }}>
                        🔋 No charging stops required for this route!
                      </div>
                    ) : (
                      routeData.stops.map((stop, idx) => (
                        <div
                          key={idx}
                          style={{
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            borderRadius: 12,
                            padding: '10px 12px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-accent)'}
                          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                        >
                          <div style={{ textAlign: 'left', maxWidth: '75%' }}>
                            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ background: '#3B82F6', color: 'white', fontSize: '9px', borderRadius: '50%', width: 14, height: 14, display: 'inline-flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center' }}>
                                {idx + 1}
                              </span>
                              {stop.name}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📍 {stop.address}</div>
                            <div style={{ display: 'flex', gap: 10, fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                              <span>🔋 {stop.arrivalSoC}% ➔ {stop.departureSoC}%</span>
                              <span style={{ color: 'var(--accent)' }}>⚡ {stop.maxSpeed}</span>
                            </div>
                          </div>

                          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 750, color: '#3B82F6' }}>+{stop.chargeTimeMinutes}m</span>
                            <button
                              onClick={() => {
                                if (mapInstanceRef.current) {
                                  mapInstanceRef.current.setZoom(14);
                                  mapInstanceRef.current.panTo({ lat: stop.lat, lng: stop.lng });
                                  setActivePin(stop);
                                }
                              }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', padding: '2px 6px', outline: 'none' }}
                              title="Center Stop"
                            >
                              🎯
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                </div>
              )}

            </div>
          )}

        </div>

      </div>
    </section>
  );
}

function StationCard({ station, delay }) {
  const { setSelectedStation, setBookingModal, user, setAuthModal } = useApp();
  const tilt = useTiltCard(6);
  const [hov, setHov] = useState(false);
  const isAvail = station.status==='available';
  const handleBook = () => { if(!user){setAuthModal('login');return;} setSelectedStation(station); setBookingModal(true); };

  return (
    <div ref={tilt.ref} {...tilt.handlers} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>{setHov(false);tilt.handlers.onMouseLeave();}}
      className={`reveal visible reveal-delay-${delay%4+1}`}
      style={{ background:'var(--surface)', border:'1px solid '+(hov?'var(--glass-border-hover)':'var(--glass-border)'), borderRadius:20, padding:'1.5rem',
        boxShadow: hov?'var(--shadow-lg), var(--card-hover-glow)':'var(--shadow-sm)', ...tilt.style,
        transition:'border-color 0.2s, box-shadow 0.3s, transform 0.3s cubic-bezier(0.23,1,0.32,1)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1rem' }}>
        <div style={{ width:42, height:42, background:'var(--accent-light)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.2rem' }}>{station.icon}</div>
        <span style={{ padding:'0.2rem 0.7rem', borderRadius:50, fontSize:'0.7rem', fontWeight:700, background:isAvail?'rgba(16,185,129,0.08)':'rgba(245,158,11,0.08)', color:isAvail?'var(--accent)':'#F59E0B' }}>{isAvail?'Available':'Busy'}</span>
      </div>
      <div style={{ fontSize:'1rem', fontWeight:700, marginBottom:'0.3rem', color:'var(--text)' }}>{station.name}</div>
      <div style={{ fontSize:'0.8rem', color:'var(--muted)', marginBottom:'1rem' }}>📍 {station.address} · {station.distance}</div>
      <div style={{ display:'flex', gap:'1rem', marginBottom:'1rem' }}>
        {[['portsOpen','Ports'],['maxSpeed','Speed'],['price','Price']].map(([k,l])=><div key={k} style={{ fontSize:'0.78rem', color:'var(--muted)' }}><strong style={{ color:'var(--text)', display:'block', fontSize:'0.88rem' }}>{station[k]}</strong>{l}</div>)}
      </div>
      <div style={{ display:'flex', gap:'0.4rem', marginBottom:'1.2rem', flexWrap:'wrap' }}>
        {station.connectors.map(c=><span key={c} style={{ padding:'0.2rem 0.55rem', border:'1px solid var(--border)', borderRadius:6, fontSize:'0.7rem', color:'var(--muted)', background:'var(--bg-soft)' }}>{c}</span>)}
      </div>
      <div style={{ display:'flex', gap:'0.6rem' }}>
        <button onClick={handleBook} style={btnBase('primary',{flex:1,padding:'0.65rem',fontSize:'0.82rem'})}>Book Slot</button>
        <button 
          onClick={() => station.lat && window.open('https://www.google.com/maps/dir/?api=1&destination=' + station.lat + ',' + station.lng, '_blank')} 
          style={{
            ...btnBase('ghost', {
              padding: '0.65rem 1rem',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            })
          }}
        >
          <DirectionsIcon size={14} />
          Navigate
        </button>
      </div>
    </div>
  );
}

export function StationsSection({ apiStations, loading }) {
  const [activeTab, setActiveTab] = useState('All');
  const rev = useScrollReveal();
  const base = apiStations.length ? apiStations : STATIONS;
  const filtered = activeTab==='All' ? base : base.filter(s=>({'Fast DC':s=>s.connectors.some(c=>c.includes('CCS')||c.includes('CHAde')),'AC':s=>s.connectors.some(c=>c.includes('AC')||c.includes('Type 2')),'CCS2':s=>s.connectors.some(c=>c.includes('CCS2'))}[activeTab]?.(s)));
  const displayedStations = filtered.slice(0, 10);

  return (
    <section id="stations" ref={rev.ref} className={`reveal ${rev.visible?'visible':''}`} style={secStyle('var(--bg)')}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:'2rem', flexWrap:'wrap', gap:'1rem' }}>
        <div><div style={tagStyle}>Nearby</div><h2 style={{...h2Style,marginBottom:0}}>Available Stations</h2></div>
        <div style={{ display:'flex', gap:'0.4rem', flexWrap:'wrap' }}>
          {FILTER_TABS.map(t=><button key={t} onClick={()=>setActiveTab(t)} style={btnBase(activeTab===t?'primary':'ghost',{fontSize:'0.8rem',padding:'0.4rem 0.9rem',fontWeight:activeTab===t?700:500})}>{t}</button>)}
        </div>
      </div>
      {loading ? (
        <div style={{ textAlign:'center', padding:'3rem', color:'var(--muted)', display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
          <Spin s={28} /><p>Loading stations...</p>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'1.2rem' }}>
          {displayedStations.map((s,i)=><StationCard key={s._id} station={s} delay={i} />)}
        </div>
      )}
    </section>
  );
}

export function HowItWorks() {
  const rev = useScrollReveal();
  return (
    <section id="how" ref={rev.ref} className={`reveal ${rev.visible?'visible':''}`} style={{ ...secStyle('var(--bg-soft)'), textAlign:'center' }}>
      <div style={tagStyle}>How It Works</div>
      <h2 style={h2Style}>Charge in 4 Simple Steps</h2>
      <p style={{ color:'var(--muted)', maxWidth:460, margin:'0 auto 3rem', lineHeight:1.7 }}>No surprises, no waiting. Just plug in and power up.</p>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:'1.2rem', maxWidth:960, margin:'0 auto' }}>
        {HOW_STEPS.map((s,i) => <HowCard key={s.num} step={s} delay={i} />)}
      </div>
    </section>
  );
}

function HowCard({ step, delay }) {
  const tilt = useTiltCard(5);
  const [hov, setHov] = useState(false);
  return (
    <div ref={tilt.ref} {...tilt.handlers} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>{setHov(false);tilt.handlers.onMouseLeave();}}
      className={`reveal visible reveal-delay-${delay+1}`}
      style={{ background:'var(--surface)', border:'1px solid '+(hov?'var(--glass-border-hover)':'var(--glass-border)'), borderRadius:20, padding:'2rem 1.5rem', position:'relative', textAlign:'left',
        boxShadow: hov?'var(--shadow-lg), var(--card-hover-glow-sm)':'var(--shadow-sm)', ...tilt.style, transition:'all 0.3s cubic-bezier(0.23,1,0.32,1)' }}>
      <div style={{ fontSize:'2.5rem', fontWeight:800, color:'var(--accent-light)', position:'absolute', top:'1rem', right:'1.2rem', lineHeight:1, opacity:0.6 }}>{step.num}</div>
      <div style={{ width:48, height:48, background:'var(--accent-light)', borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.4rem', marginBottom:'1rem' }}>{step.icon}</div>
      <div style={{ fontSize:'1rem', fontWeight:700, marginBottom:'0.5rem', color:'var(--text)' }}>{step.title}</div>
      <div style={{ fontSize:'0.84rem', color:'var(--muted)', lineHeight:1.65 }}>{step.desc}</div>
    </div>
  );
}

export function BookingSection() {
  const { user, setAuthModal, setBookingModal, setSelectedStation } = useApp();
  const rev = useScrollReveal();
  const [form, setForm] = useState({ station:STATIONS[0].name, connector:CONNECTOR_TYPES[0], vehicle:'', date:'', time:'10:00', duration:'2 hours' });
  const set = k => e => setForm(f=>({...f,[k]:e.target.value}));
  const handleConfirm = () => { if(!user){setAuthModal('login');return;} setSelectedStation(STATIONS.find(s=>s.name===form.station)||STATIONS[0]); setBookingModal(true); };

  return (
    <section id="booking" ref={rev.ref} className={`reveal ${rev.visible?'visible':''}`} style={secStyle('var(--bg)')}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:'3rem', alignItems:'center', maxWidth:1100, margin:'0 auto' }}>
        <div>
          <div style={tagStyle}>Reserve Now</div>
          <h2 style={h2Style}>Book Your<br/>Charging Slot</h2>
          <p style={{ color:'var(--muted)', marginBottom:'2rem', maxWidth:400, lineHeight:1.7 }}>Pick a station, choose your time, and arrive knowing a port is waiting.</p>
          {[['✅','Free cancellation','Cancel up to 30 min before your slot.'],['🔒','Guaranteed port','Your slot is reserved and locked.'],['💳','Pay after charging','UPI, card, or wallet — billed on completion.']].map(([icon,title,desc])=>(
            <div key={title} style={{ display:'flex', gap:'1rem', alignItems:'flex-start', marginBottom:'1rem' }}>
              <div style={{ width:40, height:40, background:'var(--accent-light)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:'1.1rem' }}>{icon}</div>
              <div><div style={{ fontWeight:600, fontSize:'0.9rem', marginBottom:2, color:'var(--text)' }}>{title}</div><div style={{ fontSize:'0.82rem', color:'var(--muted)' }}>{desc}</div></div>
            </div>
          ))}
        </div>
        <div style={{ background:'var(--surface)', border:'1px solid var(--glass-border)', borderRadius:24, padding:'2rem', boxShadow:'var(--shadow-lg)' }}>
          <div style={{ fontSize:'1.3rem', fontWeight:800, marginBottom:'0.3rem', color:'var(--text)' }}>Reserve a Slot</div>
          <div style={{ color:'var(--muted)', fontSize:'0.84rem', marginBottom:'1.5rem' }}>Fill in the details to secure your time</div>
          {[['Station',<select value={form.station} onChange={set('station')} style={inpStyle}>{STATIONS.map(s=><option key={s._id}>{s.name}</option>)}</select>],
            ['Connector',<select value={form.connector} onChange={set('connector')} style={inpStyle}>{CONNECTOR_TYPES.map(c=><option key={c}>{c}</option>)}</select>],
            ['Vehicle',<input value={form.vehicle} onChange={set('vehicle')} placeholder="e.g. Tata Nexon EV" style={inpStyle} />],
            ['Date & Time',<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.6rem'}}><input type="date" value={form.date} onChange={set('date')} style={inpStyle}/><input type="time" value={form.time} onChange={set('time')} style={inpStyle}/></div>],
            ['Duration',<select value={form.duration} onChange={set('duration')} style={inpStyle}>{['30 min','1 hour','1.5 hours','2 hours','3 hours'].map(d=><option key={d}>{d}</option>)}</select>]
          ].map(([label,field])=>(
            <div key={label} style={{ marginBottom:'1rem' }}><label style={{ fontSize:'0.78rem', color:'var(--muted)', marginBottom:'0.35rem', display:'block', fontWeight:600 }}>{label}</label>{field}</div>
          ))}
          <MagneticButton variant="primary" onClick={handleConfirm} style={{ width:'100%', padding:'0.85rem', fontSize:'0.95rem', marginTop:'0.5rem' }}>⚡ Confirm Booking</MagneticButton>
        </div>
      </div>
    </section>
  );
}

// ─── Mock articles for when backend is offline ───────────────────────────────
const MOCK_ARTICLES = [
  { _id:'a1', title:'India Targets 10 Million EV Chargers by 2030', slug:'india-ev-chargers-2030', excerpt:'The government announces ambitious plans to expand the EV charging infrastructure across all major highways and urban centers.', coverImage:{url:null}, tags:['EV News','Policy'], readTime:4, publishedAt:'2026-05-28T10:00:00Z', views:1240, author:{name:'NextCharge Team'} },
  { _id:'a2', title:'CCS2 vs CHAdeMO: Which Fast Charger Wins?', slug:'ccs2-vs-chademo', excerpt:'A comprehensive comparison of the two dominant DC fast charging standards and what it means for Indian EV owners.', coverImage:{url:null}, tags:['Charging Tips'], readTime:6, publishedAt:'2026-05-25T08:00:00Z', views:890, author:{name:'Priya Patel'} },
  { _id:'a3', title:'How to Maximize Your EV Battery Life', slug:'maximize-ev-battery-life', excerpt:'Expert tips on charging habits, temperature management, and driving patterns that extend your battery lifespan by years.', coverImage:{url:null}, tags:['Tips & Guides'], readTime:5, publishedAt:'2026-05-22T14:00:00Z', views:2100, author:{name:'Rahul Mehta'} },
  { _id:'a4', title:'Top 5 Road Trip Routes with EV Charging', slug:'top-5-ev-road-trips', excerpt:'Plan your next electric road trip with our curated routes that have reliable charging infrastructure every 100km.', coverImage:{url:null}, tags:['Travel'], readTime:7, publishedAt:'2026-05-20T10:00:00Z', views:1560, author:{name:'NextCharge Team'} },
  { _id:'a5', title:'The Rise of Ultra-Fast 350kW Chargers in India', slug:'ultra-fast-chargers-india', excerpt:'New ultra-fast chargers promise to add 200km range in just 10 minutes. Here\'s where to find them.', coverImage:{url:null}, tags:['EV News','Technology'], readTime:4, publishedAt:'2026-05-18T09:00:00Z', views:3200, author:{name:'Amit Shah'} },
  { _id:'a6', title:'EV Charging Costs: A Complete Breakdown', slug:'ev-charging-costs-breakdown', excerpt:'Understanding per-kWh pricing, time-based billing, and how to save money on every charge session.', coverImage:{url:null}, tags:['Tips & Guides'], readTime:5, publishedAt:'2026-05-15T12:00:00Z', views:1800, author:{name:'NextCharge Team'} },
];

const TAG_COLORS = {
  'EV News': { bg: 'rgba(59,130,246,0.1)', color: '#3B82F6' },
  'Policy': { bg: 'rgba(139,92,246,0.1)', color: '#8B5CF6' },
  'Charging Tips': { bg: 'rgba(16,185,129,0.1)', color: '#10B981' },
  'Tips & Guides': { bg: 'rgba(245,158,11,0.1)', color: '#F59E0B' },
  'Travel': { bg: 'rgba(236,72,153,0.1)', color: '#EC4899' },
  'Technology': { bg: 'rgba(6,182,212,0.1)', color: '#06B6D4' },
  'Industry': { bg: 'rgba(99,102,241,0.1)', color: '#6366F1' },
};

function getTagStyle(tag) {
  return TAG_COLORS[tag] || { bg: 'var(--accent-light)', color: 'var(--accent)' };
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function NewsCard({ article, onClick }) {
  const [hov, setHov] = useState(false);
  const tag = article.tags?.[0] || 'News';
  const ts = getTagStyle(tag);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: 'var(--surface)',
        border: '1px solid ' + (hov ? 'var(--glass-border-hover)' : 'var(--glass-border)'),
        borderRadius: 20,
        overflow: 'hidden',
        cursor: 'pointer',
        boxShadow: hov ? 'var(--shadow-lg), var(--card-hover-glow)' : 'var(--shadow-sm)',
        transform: hov ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'all 0.3s cubic-bezier(0.23,1,0.32,1)',
        minWidth: 0,
        flexShrink: 0,
        width: '100%',
      }}
    >
      {/* Cover Image */}
      <div style={{ width: '100%', height: 180, background: 'var(--bg-alt)', position: 'relative', overflow: 'hidden' }}>
        {article.coverImage?.url ? (
          <img src={article.coverImage.url} alt={article.title} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s', transform: hov ? 'scale(1.05)' : 'scale(1)' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, var(--bg-alt) 0%, var(--bg-soft) 100%)`, fontSize: '2.5rem' }}>
            📰
          </div>
        )}
        {/* Tag Badge */}
        <span style={{ position: 'absolute', top: 12, left: 12, background: ts.bg, color: ts.color, fontSize: '0.68rem', fontWeight: 700, padding: '4px 10px', borderRadius: 20, backdropFilter: 'blur(8px)', border: `1px solid ${ts.color}22` }}>
          {tag}
        </span>
      </div>

      {/* Content */}
      <div style={{ padding: '1.2rem 1.4rem 1.4rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 750, color: 'var(--text)', marginBottom: '0.5rem', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {article.title}
        </h3>
        <p style={{ fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {article.excerpt || article.body?.substring(0, 120) + '...'}
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--muted-light)' }}>
          <span>📖 {article.readTime || 3} min read</span>
          <span>{formatDate(article.publishedAt)}</span>
        </div>
      </div>
    </div>
  );
}

export function NewsSection() {
  const { fetchArticles } = useApp();
  const rev = useScrollReveal();
  const [articles, setArticles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timerRef = useRef(null);

  // Responsive: how many cards to show at once
  const [cardsToShow, setCardsToShow] = useState(3);
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) setCardsToShow(1);
      else if (window.innerWidth < 960) setCardsToShow(2);
      else setCardsToShow(3);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch articles
  useEffect(() => {
    (async () => {
      try {
        const { articles: fetched } = await fetchArticles(1);
        setArticles(fetched.length > 0 ? fetched : MOCK_ARTICLES);
      } catch {
        setArticles(MOCK_ARTICLES);
      }
    })();
  }, [fetchArticles]);

  const maxIndex = Math.max(0, articles.length - cardsToShow);

  // Auto-swipe
  useEffect(() => {
    if (isPaused || articles.length <= cardsToShow) return;
    timerRef.current = setInterval(() => {
      setIsTransitioning(true);
      setCurrentIndex(prev => prev >= maxIndex ? 0 : prev + 1);
    }, 5000);
    return () => clearInterval(timerRef.current);
  }, [isPaused, articles.length, cardsToShow, maxIndex]);

  const goTo = (idx) => {
    setIsTransitioning(true);
    setCurrentIndex(Math.max(0, Math.min(idx, maxIndex)));
  };

  const handleNav = (article) => {
    window.location.href = '/news/' + article.slug;
  };

  if (articles.length === 0) return null;

  const dotCount = Math.min(maxIndex + 1, 8);

  return (
    <section id="news" ref={rev.ref} className={`reveal ${rev.visible ? 'visible' : ''}`} style={{ ...secStyle('var(--bg-soft)'), overflow: 'hidden' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={tagStyle}>News & Insights</div>
            <h2 style={h2Style}>Latest from the EV World</h2>
            <p style={{ color: 'var(--muted)', maxWidth: 460, lineHeight: 1.7, fontSize: '0.92rem' }}>
              Stay updated with the latest in EV charging, industry trends, and expert tips.
            </p>
          </div>
          <a href="/news" style={{ ...btnBase('ghost', { padding: '0.6rem 1.2rem', fontSize: '0.82rem', textDecoration: 'none', borderRadius: 50 }) }}>
            View All Articles →
          </a>
        </div>

        {/* Carousel */}
        <div
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          style={{ position: 'relative' }}
        >
          {/* Arrow buttons */}
          {articles.length > cardsToShow && (
            <>
              <button
                onClick={() => goTo(currentIndex - 1)}
                disabled={currentIndex === 0}
                style={{
                  position: 'absolute', left: -16, top: '50%', transform: 'translateY(-50%)', zIndex: 10,
                  width: 42, height: 42, borderRadius: '50%', border: '1px solid var(--glass-border)',
                  background: 'var(--surface)', color: 'var(--text)', fontSize: '1.1rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: 'var(--shadow-md)', opacity: currentIndex === 0 ? 0.3 : 1,
                  transition: 'all 0.2s', outline: 'none'
                }}
              >
                ←
              </button>
              <button
                onClick={() => goTo(currentIndex + 1)}
                disabled={currentIndex >= maxIndex}
                style={{
                  position: 'absolute', right: -16, top: '50%', transform: 'translateY(-50%)', zIndex: 10,
                  width: 42, height: 42, borderRadius: '50%', border: '1px solid var(--glass-border)',
                  background: 'var(--surface)', color: 'var(--text)', fontSize: '1.1rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: 'var(--shadow-md)', opacity: currentIndex >= maxIndex ? 0.3 : 1,
                  transition: 'all 0.2s', outline: 'none'
                }}
              >
                →
              </button>
            </>
          )}

          {/* Cards track */}
          <div style={{ overflow: 'hidden', borderRadius: 20 }}>
            <div
              onTransitionEnd={() => setIsTransitioning(false)}
              style={{
                display: 'flex',
                gap: '1.2rem',
                transform: `translateX(-${currentIndex * (100 / cardsToShow + 1.2)}%)`,
                transition: isTransitioning ? 'transform 0.6s cubic-bezier(0.23, 1, 0.32, 1)' : 'none',
              }}
            >
              {articles.map((article) => (
                <div key={article._id} style={{ flex: `0 0 calc(${100 / cardsToShow}% - ${(cardsToShow - 1) * 1.2 / cardsToShow}rem)` }}>
                  <NewsCard article={article} onClick={() => handleNav(article)} />
                </div>
              ))}
            </div>
          </div>

          {/* Dot Indicators */}
          {articles.length > cardsToShow && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: '1.8rem' }}>
              {Array.from({ length: dotCount }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  style={{
                    width: currentIndex === i ? 24 : 8,
                    height: 8,
                    borderRadius: 4,
                    border: 'none',
                    background: currentIndex === i ? 'var(--accent)' : 'var(--border)',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    outline: 'none',
                    boxShadow: currentIndex === i ? 'var(--neon-glow)' : 'none',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

const AndroidSvg = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.6 9.48l1.79-3.1a0.56 0.56 0 0 0-.2-.77 0.57 0.57 0 0 0-.77.2L16.6 8.94A8.7 8.7 0 0 0 12 7.62a8.7 8.7 0 0 0-4.6 1.32L5.58 5.81a0.57 0.57 0 0 0-.77-.2 0.56 0.56 0 0 0-.2.77l1.79 3.1A9.09 9.09 0 0 0 3 17.25h18a9.09 9.09 0 0 0-3.4-7.77zm-10.16 4.59a0.84 0.84 0 1 1 .84-.84 0.84 0 0 1-.84.84zm9.12 0a0.84 0.84 0 1 1 .84-.84 0.84 0 0 1-.84.84z" />
  </svg>
);

export function AppSection() {
  const rev = useScrollReveal();
  const [hovApp, setHovApp] = useState(false);
  return (
    <section id="app" ref={rev.ref} className={`reveal ${rev.visible?'visible':''}`} style={{ ...secStyle('var(--bg-soft)'), textAlign:'center' }}>
      <div style={tagStyle}>Download the App</div>
      <h2 style={h2Style}>Charge on the Go</h2>
      <p style={{ color:'var(--muted)', maxWidth:480, margin:'0.5rem auto 0', lineHeight:1.7, fontSize:'0.95rem' }}>
        Find nearby stations, start charging with a tap, track your sessions in real-time, and get instant payment receipts — everything you need, right from your phone.
      </p>
      <div style={{ display:'flex', gap:'1rem', justifyContent:'center', marginTop:'2.5rem', flexWrap:'wrap' }}>
        <a href="/nextcharge.apk" download="nextcharge.apk"
          onMouseEnter={()=>setHovApp(true)} onMouseLeave={()=>setHovApp(false)}
          style={{ display:'flex', alignItems:'center', gap:14, background: hovApp?'var(--accent-light)':'var(--glass-bg)', border: hovApp?'1px solid var(--glass-border-hover)':'1px solid var(--glass-border)', borderRadius:16, padding:'0.95rem 2.2rem', cursor:'pointer', textDecoration:'none', transition:'all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1)', transform: hovApp?'translateY(-3px)':'translateY(0)', boxShadow: hovApp?'var(--neon-glow), var(--shadow-sm)':'var(--shadow-sm)' }}>
          <span style={{ color:'var(--text)', display:'flex', alignItems:'center', transform: hovApp?'scale(1.08)':'scale(1)', transition:'all 0.25s' }}><AndroidSvg /></span>
          <div style={{ textAlign:'left' }}>
            <small style={{ display:'block', fontSize:'0.65rem', color:'var(--muted)', lineHeight:1.3 }}>Direct APK Download</small>
            <strong style={{ fontSize:'1rem', color:'var(--text)', letterSpacing:'-0.01em' }}>Download our Android App</strong>
          </div>
        </a>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer style={{ padding:'4rem 5% 2rem', background:'var(--bg-soft)', borderTop:'1px solid var(--section-border)' }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:'2.5rem', marginBottom:'3rem' }}>
        <div>
          <div onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ fontSize:'1.4rem', fontWeight:800, marginBottom:'1rem', cursor:'pointer' }}>Next<span style={{color:'var(--accent)', textShadow:'var(--accent-text-glow)'}}>Charge</span></div>
          <p style={{ color:'var(--muted)', fontSize:'0.84rem', lineHeight:1.7 }}>India's most reliable EV charging network.</p>
        </div>
        {[['Network',['Find Stations','Add a Station','Partners','Map']],['Company',['About','Careers','Blog','Press']],['Support',['Help Center','Contact','Privacy','Terms']]].map(([title,links])=>(
          <div key={title}><div style={{ fontWeight:700, fontSize:'0.84rem', marginBottom:'0.8rem', color:'var(--text)' }}>{title}</div><ul style={{ listStyle:'none', padding:0, margin:0, display:'flex', flexDirection:'column', gap:'0.5rem' }}>{links.map(l=><li key={l}><span style={{ color:'var(--muted)', fontSize:'0.84rem', cursor:'default', transition:'color 0.2s' }}>{l}</span></li>)}</ul></div>
        ))}
      </div>
      <div style={{ borderTop:'1px solid var(--glass-border)', paddingTop:'1.5rem', display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:'1rem' }}>
        <p style={{ fontSize:'0.78rem', color:'var(--muted-light)' }}>© 2024 NextCharge Technologies Pvt. Ltd.</p>
        <p style={{ fontSize:'0.78rem', color:'var(--muted-light)' }}>Made in India 🇮🇳</p>
      </div>
    </footer>
  );
}

export function Spin({ s=16 }) {
  return <div style={{ width:s, height:s, border:`2px solid var(--border)`, borderTopColor:'var(--accent)', borderRadius:'50%', animation:'spin 0.7s linear infinite', flexShrink:0 }} />;
}

export function Toasts() {
  const { toasts } = useApp();
  const colors = { success:'var(--accent)', error:'#EF4444', info:'#3B82F6', warning:'#F59E0B' };
  const icons = { success:'✓', error:'✕', info:'ℹ', warning:'⚠' };
  return (
    <div style={{ position:'fixed', bottom:'1.5rem', right:'1.5rem', zIndex:99999, display:'flex', flexDirection:'column', gap:10, maxWidth:360 }}>
      {toasts.map(t=>(
        <div key={t.id} style={{ background:'var(--surface)', borderLeft:'3px solid '+(colors[t.type]||'var(--accent)'), border:'1px solid var(--input-border)', color:'var(--text)', padding:'12px 16px', borderRadius:12, fontFamily:'inherit', fontSize:'0.85rem', display:'flex', alignItems:'center', gap:10, animation:'slideUp 0.25s ease', boxShadow:'var(--shadow-lg)' }}>
          <span style={{ color:colors[t.type]||'var(--accent)', fontWeight:700, flexShrink:0 }}>{icons[t.type]||'✓'}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
