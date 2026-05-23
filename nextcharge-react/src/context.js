import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { apiCall } from './data';

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
    return r.ok ? (r.data.data || []) : null;
  }, []);

  return (
    <Ctx.Provider value={{ user, token, toasts, showToast, authModal, setAuthModal, bookingModal, setBookingModal, selectedStation, setSelectedStation, backendOnline, login, signup, logout, googleLogin, createBooking, searchStations, theme, toggleTheme }}>
      {children}
    </Ctx.Provider>
  );
}
