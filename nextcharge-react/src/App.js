import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider, useApp } from './context';
import Navbar from './Navbar';
import Hero from './Hero';
import { StatsBar, MapSection, StationsSection, HowItWorks, BookingSection, NewsSection, AppSection, Footer, Toasts } from './Sections';
import { AuthModal, BookingModal } from './Modals';
import ArticleEditorModal from './ArticleEditor';
import NewsPage from './NewsPage';

import ErrorBoundary from './ErrorBoundary';

function HomePage() {
  const { searchStations, showToast } = useApp();
  const [apiStations, setApiStations] = useState([]);
  const [nearbyStations, setNearbyStations] = useState([]);
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
    <>
      <ErrorBoundary name="Hero"><Hero /></ErrorBoundary>
      <ErrorBoundary name="Stats Bar"><StatsBar /></ErrorBoundary>
      <ErrorBoundary name="Map Section">
        <MapSection onSearch={handleSearch} apiStations={apiStations} onStationsChange={setNearbyStations} />
      </ErrorBoundary>
      <ErrorBoundary name="Stations Section">
        <StationsSection apiStations={nearbyStations.length ? nearbyStations : apiStations} loading={loading} />
      </ErrorBoundary>
      <ErrorBoundary name="How It Works"><HowItWorks /></ErrorBoundary>
      <ErrorBoundary name="Booking Section">
        <BookingSection apiStations={nearbyStations.length ? nearbyStations : apiStations} />
      </ErrorBoundary>
      <ErrorBoundary name="News Section"><NewsSection /></ErrorBoundary>
      <ErrorBoundary name="App Section"><AppSection /></ErrorBoundary>
      <ErrorBoundary name="Footer"><Footer /></ErrorBoundary>
    </>
  );
}

function AppContent() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", transition: 'background 0.4s ease, color 0.4s ease' }}>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/news" element={<NewsPage />} />
        <Route path="/news/:slug" element={<NewsPage />} />
      </Routes>
      <AuthModal />
      <BookingModal />
      <ArticleEditorModal />
      <Toasts />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </BrowserRouter>
  );
}
