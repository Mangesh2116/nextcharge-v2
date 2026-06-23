export const STATIONS = [];

export const STATS = [
  { num: 'Launching Soon', label: 'Charging Points', icon: '⚡' },
  { num: 'Launching Soon', label: 'Happy Users', icon: '😊' },
  { num: 'Launching Soon', label: 'Charging Sessions', icon: '🔋' },
  { num: 'Launching Soon', label: 'CO₂ Saved', icon: '🌿' },
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
  const timeout = setTimeout(() => controller.abort(), opts.timeout || 15000);
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
