import { useEffect, useRef, useState } from 'react';
import { PREVIEW_PORT, previewStatus, startPreview, stopPreview, killPort } from '../api';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Status = 'down' | 'starting' | 'up' | 'stopping';

/**
 * Live preview: a switch that spawns the site's own Vite dev server and shows
 * the real website in an iframe. The switch only flips OFF once the port is
 * actually free; if a polite stop fails it stays ON and exposes "Kill port".
 */
export default function PreviewServer({ repo }: { repo: string }) {
  const [status, setStatus] = useState<Status>('down');
  const [error, setError] = useState<string | null>(null);
  const [needsKill, setNeedsKill] = useState(false);
  const [path, setPath] = useState('/');
  const [reloadKey, setReloadKey] = useState(0);
  const alive = useRef(true);

  const url = `http://localhost:${PREVIEW_PORT}${path.startsWith('/') ? path : '/' + path}`;
  const busy = status === 'starting' || status === 'stopping';
  const on = status === 'up' || status === 'starting';

  useEffect(() => {
    alive.current = true;
    previewStatus().then((up) => { if (alive.current && up) setStatus('up'); });
    return () => { alive.current = false; };
  }, []);

  async function start() {
    setError(null);
    setStatus('starting');
    try {
      await startPreview(repo);
    } catch (e) {
      setStatus('down');
      setError(e instanceof Error ? e.message : String(e));
      return;
    }
    for (let i = 0; i < 40; i++) {
      if (!alive.current) return;
      if (await previewStatus()) {
        setStatus('up');
        setReloadKey((k) => k + 1);
        return;
      }
      await sleep(500);
    }
    if (alive.current) {
      setStatus('down');
      setError('The dev server did not come up in time. Make sure `pnpm install` has been run in the repo.');
    }
  }

  async function stop() {
    setError(null);
    setStatus('stopping');
    try {
      const stopped = await stopPreview();
      if (stopped) {
        setStatus('down');
        setNeedsKill(false);
      } else {
        // Refuse to flip off — the server is still listening.
        setStatus('up');
        setNeedsKill(true);
        setError(`The server did not shut down. Use “Kill port ${PREVIEW_PORT}”.`);
      }
    } catch (e) {
      setStatus('up');
      setNeedsKill(true);
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function doKill() {
    setError(null);
    try {
      await killPort();
      if (await previewStatus()) {
        setError('Port is still in use after the kill attempt.');
      } else {
        setStatus('down');
        setNeedsKill(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="app">
      <div className="topbar">
        <h1 style={{ fontWeight: 400 }}>Preview</h1>
        <div className="spacer" />
        <span className="muted" style={{ fontSize: 12 }}>
          {status === 'up' ? `live · localhost:${PREVIEW_PORT}` : status === 'starting' ? 'starting…' : status === 'stopping' ? 'stopping…' : 'server off'}
        </span>
        <button className={`switch ${on ? 'on' : ''}`} role="switch" aria-checked={on} disabled={busy} title="Start/stop preview server" onClick={() => (on ? stop() : start())}>
          <span className="knob" />
        </button>
        {(status !== 'down' || needsKill) && (
          <button className="small ghost" onClick={doKill}>Kill port {PREVIEW_PORT}</button>
        )}
      </div>

      <div className="content preview-content">
        <div className="preview-bar">
          <input
            value={path}
            onChange={(e) => setPath(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') setReloadKey((k) => k + 1); }}
            placeholder="/   ·   /blog/marv   ·   /#projects"
          />
          <button className="small" disabled={status !== 'up'} onClick={() => setReloadKey((k) => k + 1)}>Reload</button>
        </div>
        {error && <div className="notice error" style={{ margin: 12 }}>{error}</div>}
        {status === 'up' ? (
          <iframe key={reloadKey} className="preview-frame" src={url} title="Live preview" />
        ) : (
          <div className="empty">
            {status === 'starting' ? 'Starting the dev server…' : 'Flip the switch to start the live preview server.'}
          </div>
        )}
      </div>
    </div>
  );
}
