import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import SpaceBackground from './components/SpaceBackgroundLazy';
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

/**
 * One persistent starfield for the whole app: it lives above <Routes> so it is
 * never unmounted on navigation (no hard reset). Each pathname change bumps a
 * signal that the background turns into a warp jump.
 */
function PersistentBackground() {
  const { pathname } = useLocation();
  const [warpSignal, setWarpSignal] = useState(0);
  const prevPath = useRef(pathname);
  useEffect(() => {
    if (prevPath.current === pathname) return;
    prevPath.current = pathname;
    setWarpSignal((n) => n + 1);
  }, [pathname]);
  return <SpaceBackground warpSignal={warpSignal} />;
}

/**
 * Routed pages, each fading in on navigation. The wrapper is keyed by pathname
 * so React remounts it per route, replaying the opacity animation. Only the
 * page content fades — the persistent starfield lives outside this subtree.
 */
function AnimatedRoutes() {
  const location = useLocation();
  return (
    <div key={location.pathname} className="page-in">
      <Routes location={location}>
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
  );
}

function App() {
  return (
    <Router>
      <ImageModalProvider>
        <ScrollToTop />
        <div className="min-h-screen bg-canvas text-ink relative">
          <PersistentBackground />
          <AnimatedRoutes />
        </div>
      </ImageModalProvider>
    </Router>
  );
}

export default App;
