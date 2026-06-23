import { useEffect, useState } from 'react';
import { readGallery, saveGallery, importPublicImage } from '../api';
import type { GalleryItem } from '@portfolio/content-schema';
import { ImageField, ItemToolbar, TextArea, TextField } from './fields';

function newItem(): GalleryItem {
  return { id: crypto.randomUUID(), src: '', alt: '', title: '', description: '' };
}

export default function GalleryEditor({ repo }: { repo: string }) {
  const [items, setItems] = useState<GalleryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    readGallery(repo).then((g) => setItems(g.items)).catch((e) => setError(String(e)));
  }, [repo]);

  function update(i: number, patch: Partial<GalleryItem>) {
    setItems((items) => items?.map((it, j) => (j === i ? { ...it, ...patch } : it)) ?? items);
    setMsg(null);
  }
  function move(i: number, dir: -1 | 1) {
    setItems((items) => {
      if (!items) return items;
      const j = i + dir;
      if (j < 0 || j >= items.length) return items;
      const next = [...items];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    setMsg(null);
  }

  async function save() {
    if (!items) return;
    setSaving(true);
    setError(null);
    setMsg(null);
    try {
      await saveGallery(repo, { items });
      setMsg('Saved ✓');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="app">
      <div className="topbar">
        <h1 style={{ fontWeight: 400 }}>Community Involvement</h1>
        <div className="spacer" />
        <button className="small ghost" onClick={() => setItems((it) => [...(it ?? []), newItem()])}>＋ New tile</button>
        <button className="primary small" onClick={save} disabled={!items || saving}>{saving ? 'Saving…' : 'Save'}</button>
      </div>

      <div className="content">
        <div className="container">
          <p className="screen-hint">Community Involvement tiles shown on the homepage. Reorder with the arrows, then Save.</p>
          {error && <div className="notice error">{error}</div>}
          {msg && <div className="notice ok">{msg}</div>}

          {items === null ? (
            <div className="empty">Loading…</div>
          ) : items.length === 0 ? (
            <div className="empty">No tiles yet. Add one.</div>
          ) : (
            items.map((item, i) => (
              <div className="tile" key={String(item.id)}>
                <div className="tile-head">
                  <span className="tile-title">{item.title || `Tile ${i + 1}`}</span>
                  <ItemToolbar
                    onUp={() => move(i, -1)}
                    onDown={() => move(i, 1)}
                    onDelete={() => setItems((its) => its?.filter((_, j) => j !== i) ?? its)}
                  />
                </div>
                <ImageField label="Image" root={repo} value={item.src} onChange={(src) => update(i, { src })} onImport={() => importPublicImage(repo)} />
                <div className="grid2">
                  <TextField label="Title" value={item.title} onChange={(v) => update(i, { title: v })} />
                  <TextField label="Alt text" value={item.alt} onChange={(v) => update(i, { alt: v })} />
                </div>
                <TextArea label="Description" value={item.description} onChange={(v) => update(i, { description: v })} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
