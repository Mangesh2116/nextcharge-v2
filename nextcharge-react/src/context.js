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

  return (
    <Ctx.Provider value={{ user, token, toasts, showToast, authModal, setAuthModal, bookingModal, setBookingModal, selectedStation, setSelectedStation, backendOnline, login, signup, logout, googleLogin, createBooking, searchStations, theme, toggleTheme, articleEditorModal, setArticleEditorModal, fetchArticles, fetchArticle, fetchAdminArticles, createArticle, updateArticle, deleteArticle }}>
      {children}
    </Ctx.Provider>
  );
}
