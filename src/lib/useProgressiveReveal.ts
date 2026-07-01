import { useEffect, useState } from 'react';

/**
 * Reveal `total` items one at a time. Waits `initialDelay` ms — so a page
 * transition / warp can play first — then increments the revealed count every
 * `step` ms until all are shown. Returns how many are currently revealed.
 *
 * Heavy children (3D model viewers, autoplaying videos) gate their mount on
 * this so they spin up sequentially instead of all in one frame, which would
 * otherwise spike the main thread / GPU right as a page loads.
 */
export function useProgressiveReveal(total: number, initialDelay = 400, step = 180): number {
  const [ready, setReady] = useState(0);

  useEffect(() => {
    setReady(0);
    if (total <= 0) return;

    let n = 0;
    let interval = 0;
    const start = window.setTimeout(() => {
      interval = window.setInterval(() => {
        n += 1;
        setReady(n);
        if (n >= total) window.clearInterval(interval);
      }, step);
    }, initialDelay);

    return () => {
      window.clearTimeout(start);
      window.clearInterval(interval);
    };
  }, [total, initialDelay, step]);

  return ready;
}
