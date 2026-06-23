import { Suspense, lazy, useEffect, useRef, useState } from 'react';

// Lazy boundary: keeps three.js + the CAD WASM out of the main bundle. The
// heavy StepViewer (and its deps) only load when a project tile that uses a 3D
// model scrolls near the viewport.
const StepViewer = lazy(() => import('./StepViewer'));

function Placeholder({ label }: { label: string }) {
  return (
    <div className="w-full h-full grid place-items-center bg-neutral-950">
      <span className="text-neutral-600 text-xs tracking-[0.15em] uppercase">{label}</span>
    </div>
  );
}

export default function Model3D({ src }: { src: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '250px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="w-full h-full">
      {inView ? (
        <Suspense fallback={<Placeholder label="Loading 3D…" />}>
          <StepViewer src={src} className="w-full h-full" />
        </Suspense>
      ) : (
        <Placeholder label="3D model" />
      )}
    </div>
  );
}
