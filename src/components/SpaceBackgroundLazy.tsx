import { lazy, Suspense } from 'react';
import { useTheme } from '../theme';

// Code-split the Three.js background out of the initial bundle. The hero text
// paints immediately on the page background; the scene fades in once its chunk
// (Three.js + this component) has loaded. Dark theme = stars/nebula ("space"),
// light theme = clouds over a blue sky ("sky").
const SpaceBackground = lazy(() => import('./SpaceBackground'));

const SpaceBackgroundLazy = () => {
  const { theme } = useTheme();
  return (
    <Suspense fallback={<div className="fixed inset-0 z-0 bg-canvas" />}>
      <SpaceBackground mode={theme === 'light' ? 'sky' : 'space'} />
    </Suspense>
  );
};

export default SpaceBackgroundLazy;
