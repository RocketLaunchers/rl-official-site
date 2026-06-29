import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import SpaceBackground from './SpaceBackgroundLazy';
import Header from './Header';
import Hero from './Hero';
import Mission from './Mission';
import TeamStrip from './TeamStrip';
import SubteamsStrip from './SubteamsStrip';
import RocketFeature from './RocketFeature';
import SponsorsStrip from './SponsorsStrip';
import NewsList from './NewsList';
import GalleryStrip from './GalleryStrip';
import JoinSection from './JoinSection';
import Footer from './Footer';

const HomePage = () => {
  // Scroll to an in-page section when arriving via /#section (e.g. header "JOIN").
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const id = hash.replace('#', '');
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }));
  }, [hash]);

  return (
    <div className="min-h-screen bg-black text-white relative">
      <SpaceBackground />
      <Header />
      <main className="relative z-10">
        <Hero />
        <Mission />
        <TeamStrip />
        <SubteamsStrip />
        <RocketFeature />
        <SponsorsStrip />
        <NewsList />
        <GalleryStrip />
        <JoinSection />
      </main>
      <Footer />
    </div>
  );
};

export default HomePage;
