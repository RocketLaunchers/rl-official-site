import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import HomePage from './components/HomePage';
import RocketsPage from './pages/RocketsPage';
import RocketDetailPage from './pages/RocketDetailPage';
import TeamPage from './pages/TeamPage';
import SubteamDetailPage from './pages/SubteamDetailPage';
import CompetitionsPage from './pages/CompetitionsPage';
import EventsPage from './pages/EventsPage';
import NewsPage from './pages/NewsPage';
import SponsorsPage from './pages/SponsorsPage';
import AlumniPage from './pages/AlumniPage';
import ConstitutionPage from './pages/ConstitutionPage';
import NewsPostPage from './pages/NewsPostPage';
import { ImageModalProvider } from './components/ImageModalProvider';

/** Reset scroll on route change, except when navigating to an in-page hash. */
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) return;
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname, hash]);
  return null;
}

function App() {
  return (
    <Router>
      <ImageModalProvider>
        <ScrollToTop />
        <div className="min-h-screen bg-black text-white relative">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/rockets" element={<RocketsPage />} />
            <Route path="/rockets/:id" element={<RocketDetailPage />} />
            <Route path="/competitions" element={<CompetitionsPage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/news" element={<NewsPage />} />
            <Route path="/team" element={<TeamPage />} />
            <Route path="/subteams/:id" element={<SubteamDetailPage />} />
            <Route path="/sponsors" element={<SponsorsPage />} />
            <Route path="/alumni" element={<AlumniPage />} />
            <Route path="/constitution" element={<ConstitutionPage />} />
            <Route path="/news/:id" element={<NewsPostPage />} />
          </Routes>
        </div>
      </ImageModalProvider>
    </Router>
  );
}

export default App;
