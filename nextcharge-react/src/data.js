export const STATIONS = [
  { _id: 's1', icon: '⚡', name: 'Tata Power EV Hub — BKC', address: 'Bandra Kurla Complex, Mumbai', distance: '0.8 km', portsOpen: '6/8', maxSpeed: '150 kW', price: '₹15/kWh', connectors: ['CCS2', 'CHAdeMO', 'Type 2 AC'], status: 'available', lat: 19.0596, lng: 72.8656, mapPos: { left: '28%', top: '33%' } },
  { _id: 's2', icon: '🔋', name: 'Ather Grid — Andheri West', address: 'Andheri West, Mumbai', distance: '2.1 km', portsOpen: '4/4', maxSpeed: '7.2 kW', price: '₹8/kWh', connectors: ['Ather', 'Type 2 AC'], status: 'available', lat: 19.1224, lng: 72.8264, mapPos: { left: '58%', top: '33%' } },
  { _id: 's3', icon: '🏢', name: 'BPCL Pulse — Powai', address: 'Powai, Mumbai', distance: '3.5 km', portsOpen: '2/6', maxSpeed: '60 kW', price: '₹12/kWh', connectors: ['CCS2', 'Type 2 AC', 'Bharat DC'], status: 'busy', lat: 19.1197, lng: 72.9081, mapPos: { left: '44%', top: '63%' } },
  { _id: 's4', icon: '⚡', name: 'ChargeZone — Worli', address: 'Worli, Mumbai', distance: '4.2 km', portsOpen: '3/3', maxSpeed: '30 kW', price: '₹10/kWh', connectors: ['CCS2', 'CHAdeMO'], status: 'available', lat: 19.0096, lng: 72.8178, mapPos: { left: '19%', top: '63%' } },
  { _id: 's5', icon: '🛣️', name: 'MG ZS Hub — Malad', address: 'Malad West, Mumbai', distance: '5.8 km', portsOpen: '8/10', maxSpeed: '50 kW', price: '₹13/kWh', connectors: ['CCS2', 'Type 2 AC', 'GB/T'], status: 'available', lat: 19.1875, lng: 72.8479, mapPos: { left: '74%', top: '58%' } },
  { _id: 's6', icon: '🏪', name: 'Reliance BP — Navi Mumbai', address: 'Vashi, Navi Mumbai', distance: '8.1 km', portsOpen: '12/12', maxSpeed: '240 kW', price: '₹18/kWh', connectors: ['CCS2', 'CHAdeMO', 'Type 2 AC'], status: 'available', lat: 19.0771, lng: 73.0071, mapPos: null },
];

export const STATS = [
  { num: '4,200+', label: 'Charging Points' },
  { num: '120+', label: 'Cities Covered' },
  { num: '98.2%', label: 'Uptime Rate' },
  { num: '50,000+', label: 'Charges This Month' },
];

export const HOW_STEPS = [
  { num: '01', icon: '🔍', title: 'Find your station', desc: 'Search by location or let us detect where you are and show nearby stations with live availability.' },
  { num: '02', icon: '📅', title: 'Book your slot', desc: 'Reserve a charging port in advance — pick your date, time, and connector type. Cancel anytime for free.' },
  { num: '03', icon: '⚡', title: 'Arrive & charge', desc: 'Scan the QR code or use the app to start charging. Pay automatically when your session ends.' },
  { num: '04', icon: '📊', title: 'Track your usage', desc: 'View session history, kWh charged, money spent, and carbon saved — all in your NextCharge dashboard.' },
];

export const CONNECTOR_TYPES = ['CCS2 (DC Fast — 150kW)', 'CHAdeMO (DC Fast)', 'Type 2 AC (7.2kW)', 'Bharat DC-001'];
export const FILTER_TABS = ['All', 'Fast DC', 'AC', 'CCS2'];

// Use explicit frontend override when available, otherwise use same-host relative API path.
const normalizeApiUrl = (url) => url?.replace(/\/+$|\/$/, '').replace(/([^:]\/)(\/)+/g, '$1');
export const API_BASE = process.env.REACT_APP_API_URL ? normalizeApiUrl(process.env.REACT_APP_API_URL) : '/api/v1';

export async function apiCall(endpoint, opts = {}, token = null) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const res = await fetch(API_BASE + endpoint, {
      method: opts.method || 'GET',
      headers,
      signal: controller.signal,
      ...(opts.body && { body: JSON.stringify(opts.body) }),
    });
    clearTimeout(timeout);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.message || 'Error ' + res.status);
    return { ok: true, data: json };
  } catch (err) {
    clearTimeout(timeout);
    return { ok: false, error: err.name === 'AbortError' ? 'Request timed out' : err.message };
  }
}
