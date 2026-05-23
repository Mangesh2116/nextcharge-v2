import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context';
import Navbar from './Navbar';
import Hero from './Hero';
import { StatsBar, MapSection, StationsSection, HowItWorks, BookingSection, AppSection, Footer, Toasts } from './Sections';
import { AuthModal, BookingModal } from './Modals';

function AppContent() {
  const { searchStations, showToast } = useApp();
  const [apiStations, setApiStations] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try { const data = await searchStations(''); if (data && data.length > 0) setApiStations(data); }
      catch (e) { /* silently use mock */ } finally { setLoading(false); }
    })();
  }, []); // eslint-disable-line

  const handleSearch = async (query) => {
    if (!query?.trim()) { setApiStations([]); return; }
    setLoading(true);
    try {
      const data = await searchStations(query);
      if (data !== null) { setApiStations(data); if (!data.length) showToast('No stations found for "' + query + '"', 'info'); }
    } catch { showToast('Search unavailable — showing local results', 'info'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", transition: 'background 0.4s ease, color 0.4s ease' }}>
      <Navbar />
      <Hero />
      <StatsBar />
      <MapSection onSearch={handleSearch} apiStations={apiStations} />
      <StationsSection apiStations={apiStations} loading={loading} />
      <HowItWorks />
      <BookingSection />
      <AppSection />
      <Footer />
      <AuthModal />
      <BookingModal />
      <Toasts />
    </div>
  );
}

export default function App() {
  return <AppProvider><AppContent /></AppProvider>;
}
