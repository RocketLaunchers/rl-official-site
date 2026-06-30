import { Suspense, lazy, useEffect, useRef, useState } from 'react';

// Lazy boundary: keeps three.js (and the STEP WASM, if used) out of the main
// bundle. Loads only when needed. `gate` defers loading until the element
// scrolls into view (used for tile previews); the fullscreen lightbox loads
// immediately (gate=false).
const ModelViewer = lazy(() => import('./ModelViewer'));

function Placeholder({ label }: { label: string }) {
  return (
    <div className="w-full h-full grid place-items-center bg-well">
      <span className="text-ink-faint text-xs tracking-[0.15em] uppercase">{label}</span>
    </div>
  );
}

export default function LazyModel({
  src,
  interactive = true,
  autoRotate = true,
  gate = true,
}: {
  src: string;
  interactive?: boolean;
  autoRotate?: boolean;
  gate?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(!gate);

  useEffect(() => {
    if (!gate) return;
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
  }, [gate]);

  return (
    <div ref={ref} className="w-full h-full">
      {inView ? (
        <Suspense fallback={<Placeholder label="Loading 3D…" />}>
          <ModelViewer src={src} interactive={interactive} autoRotate={autoRotate} className="w-full h-full" />
        </Suspense>
      ) : (
        <Placeholder label="3D model" />
      )}
    </div>
  );
}
