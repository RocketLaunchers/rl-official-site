import { albumsApi, importPublicImage, type Album } from '../api';
import type { GalleryItem } from '@portfolio/content-schema';
import CollectionEditor from './CollectionEditor';
import { Field, ImageField, TextArea, TextField } from './fields';

function newItem(): GalleryItem {
  return { id: crypto.randomUUID(), src: '', alt: '', title: '', description: '' };
}

function AlbumItems({ repo, items, onChange }: { repo: string; items: GalleryItem[]; onChange: (i: GalleryItem[]) => void }) {
  const set = (i: number, patch: Partial<GalleryItem>) => onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <Field label="Photos">
      <div style={{ display: 'grid', gap: 10 }}>
        {items.map((item, i) => (
          <div key={String(item.id)} className="tile" style={{ margin: 0, padding: 10 }}>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="small ghost" title="Move up" onClick={() => move(i, -1)}>↑</button>
              <button className="small ghost" title="Move down" onClick={() => move(i, 1)}>↓</button>
              <button className="small danger" title="Remove" onClick={() => onChange(items.filter((_, j) => j !== i))}>✕</button>
            </div>
            <ImageField label="Image" root={repo} value={item.src} onChange={(src) => set(i, { src })} onImport={() => importPublicImage(repo)} />
            <div className="grid2">
              <TextField label="Title" value={item.title} onChange={(v) => set(i, { title: v })} />
              <TextField label="Alt text" value={item.alt} onChange={(v) => set(i, { alt: v })} />
            </div>
            <TextField label="Description" value={item.description} onChange={(v) => set(i, { description: v })} />
          </div>
        ))}
        <button className="small ghost" style={{ justifySelf: 'start' }} onClick={() => onChange([...items, newItem()])}>＋ Add photo</button>
      </div>
    </Field>
  );
}

export default function GalleryEditor({ repo }: { repo: string }) {
  return (
    <CollectionEditor<Album>
      repo={repo}
      title="Gallery"
      hint="Photo albums, optionally tied to a season. The homepage shows the current season's albums."
      api={albumsApi}
      newTitleLabel="Album title"
      makeSeed={(id, title) => ({ type: 'album', id, title })}
      displayName={(a) => a.title}
      sort={(a, b) => a.displayOrder - b.displayOrder}
      renderItem={(a, update) => (
        <>
          <div className="grid2">
            <TextField label="Title" value={a.title} onChange={(v) => update({ title: v })} />
            <TextField label="Season id (optional)" value={a.season} placeholder="2025-2026" onChange={(v) => update({ season: v })} />
            <Field label="Display order">
              <input type="number" value={a.displayOrder} onChange={(e) => update({ displayOrder: Number(e.target.value) })} />
            </Field>
          </div>
          <TextArea label="Description" value={a.description} onChange={(v) => update({ description: v })} />
          <AlbumItems repo={repo} items={a.items} onChange={(items) => update({ items })} />
        </>
      )}
    />
  );
}
