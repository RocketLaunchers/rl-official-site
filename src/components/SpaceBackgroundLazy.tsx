import { lazy, Suspense } from 'react';

// Code-split the Three.js background out of the initial bundle. The hero text
// paints immediately on the page background; the scene (stars + nebulae) fades
// in once its chunk (Three.js + this component) has loaded.
const SpaceBackground = lazy(() => import('./SpaceBackground'));

const SpaceBackgroundLazy = (props: { warpSignal?: number }) => (
  <Suspense fallback={<div className="fixed inset-0 z-0 bg-canvas" />}>
    <SpaceBackground {...props} />
  </Suspense>
);

export default SpaceBackgroundLazy;
