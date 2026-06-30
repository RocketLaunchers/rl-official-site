import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from 'react';
import { listMedia, type MediaAsset, type MediaKind } from '../api';
import { Icon } from './icons';

/**
 * Browse-and-pick for assets that already live in the repo. Importing files
 * from outside only happens in Tools → Assets; everywhere else, fields call
 * `pickAsset(...)` to choose from what's already there. This keeps a single,
 * understandable place where new files enter the project.
 */

export type PickFilter = {
  /** Restrict to these asset kinds (image/video/model/other). */
  kinds?: MediaKind[];
  /** Restrict to these file extensions (e.g. ['pdf']). */
  exts?: string[];
  /** Modal heading. */
  title?: string;
};

type Ctx = { pickAsset: (f: PickFilter) => Promise<string | null> };
const PickerContext = createContext<Ctx | null>(null);

export function useAssetPicker(): Ctx {
  const ctx = useContext(PickerContext);
  if (!ctx) throw new Error('useAssetPicker must be used within an AssetPickerProvider');
  return ctx;
}

export function AssetPickerProvider({ repo, children }: { repo: string; children: ReactNode }) {
  const [filter, setFilter] = useState<PickFilter | null>(null);
  const resolverRef = useRef<((ref: string | null) => void) | null>(null);

  const pickAsset = useCallback(
    (f: PickFilter) =>
      new Promise<string | null>((resolve) => {
        resolverRef.current = resolve;
        setFilter(f);
      }),
    [],
  );

  const finish = useCallback((ref: string | null) => {
    resolverRef.current?.(ref);
    resolverRef.current = null;
    setFilter(null);
  }, []);

  return (
    <PickerContext.Provider value={{ pickAsset }}>
      {children}
      {filter && <AssetPickerModal repo={repo} filter={filter} onPick={finish} />}
    </PickerContext.Provider>
  );
}

function AssetPickerModal({
  repo, filter, onPick,
}: {
  repo: string;
  filter: PickFilter;
  onPick: (ref: string | null) => void;
}) {
  const [assets, setAssets] = useState<MediaAsset[] | null>(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    listMedia(repo).then(setAssets).catch(() => setAssets([]));
  }, [repo]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onPick(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onPick]);

  const matches = useMemo(() => {
    // Only served files (public/, with a usable ref) are pickable.
    let list = (assets ?? []).filter((a) => a.area === 'public' && a.ref && !a.system);
    if (filter.kinds) list = list.filter((a) => filter.kinds!.includes(a.kind));
    if (filter.exts) list = list.filter((a) => filter.exts!.includes(a.ext));
    const needle = q.trim().toLowerCase();
    if (needle) list = list.filter((a) => a.name.toLowerCase().includes(needle));
    return list;
  }, [assets, filter, q]);

  return (
    <div className="viewer-modal" onMouseDown={(e) => { if (e.target === e.currentTarget) onPick(null); }}>
      <div className="vm-panel picker-panel">
        <div className="vm-top">
          <div className="vm-title"><Icon name="media" size={16} /> {filter.title || 'Choose an asset'}</div>
          <div className="vm-top-actions">
            <button className="small ghost" onClick={() => onPick(null)}>Cancel ✕</button>
          </div>
        </div>

        <div className="picker-toolbar">
          <input autoFocus placeholder="Search assets…" value={q} onChange={(e) => setQ(e.target.value)} />
          <span className="picker-hint">Need a new file? Import it in <b>Tools → Assets</b> first.</span>
        </div>

        <div className="picker-body">
          {!assets ? (
            <div className="empty">Loading…</div>
          ) : matches.length === 0 ? (
            <div className="empty">
              No matching files yet.<br />
              Import them in <b>Tools → Assets</b>, then come back and pick one.
            </div>
          ) : (
            <div className="picker-grid">
              {matches.map((a) => (
                <button key={a.abs} className="picker-card" onClick={() => onPick(a.ref)} title={a.ref}>
                  <div className="picker-thumb">
                    {a.kind === 'image' && <img src={a.url} alt="" loading="lazy" />}
                    {a.kind === 'video' && <video src={a.url} muted preload="metadata" />}
                    {a.kind === 'model' && <Icon name="cube" size={24} />}
                    {a.kind === 'other' && <Icon name="file" size={24} />}
                  </div>
                  <div className="picker-name">{a.name}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
