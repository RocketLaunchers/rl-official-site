import { useEffect, useState } from 'react';
import { listProjects, saveProject, createProject, deleteProject, importPublicImage, importPublicVideo, importPublicModel, type Project } from '../api';
import { Field, ImageField, ItemToolbar, TagsField, TextArea, TextField } from './fields';
import type { MediaItem } from '@portfolio/content-schema';

const STATUSES = ['Completed', 'In Progress', 'Planned'];

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** Editor for a project's media gallery (images / videos / 3D models). */
function ProjectMediaEditor({ repo, media, onChange }: { repo: string; media: MediaItem[]; onChange: (m: MediaItem[]) => void }) {
  const set = (i: number, patch: Partial<MediaItem>) => onChange(media.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= media.length) return;
    const next = [...media];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const importFor = (type: MediaItem['type']) => {
    if (type === 'image') return importPublicImage(repo);
    if (type === 'video') return importPublicVideo(repo);
    return importPublicModel(repo);
  };

  return (
    <Field label="Media gallery — images / videos / 3D models (takes precedence over the image)">
      <div style={{ display: 'grid', gap: 10 }}>
        {media.map((item, i) => (
          <div key={i} className="tile" style={{ margin: 0, padding: 10 }}>
            <div className="row">
              <select value={item.type} onChange={(e) => set(i, { type: e.target.value as MediaItem['type'] })} style={{ width: 110 }}>
                <option value="image">image</option>
                <option value="video">video</option>
                <option value="model">model</option>
              </select>
              <input value={item.src} placeholder="/file.png · /file.glb" onChange={(e) => set(i, { src: e.target.value })} />
              <button className="small" onClick={async () => { const href = await importFor(item.type); if (href) set(i, { src: href }); }}>Import…</button>
              <button className="small ghost" title="Move up" onClick={() => move(i, -1)}>↑</button>
              <button className="small ghost" title="Move down" onClick={() => move(i, 1)}>↓</button>
              <button className="small danger" title="Remove" onClick={() => onChange(media.filter((_, j) => j !== i))}>✕</button>
            </div>
            <input value={item.caption ?? ''} placeholder="caption (optional)" style={{ marginTop: 8 }} onChange={(e) => set(i, { caption: e.target.value || undefined })} />
          </div>
        ))}
        <button className="small ghost" style={{ justifySelf: 'start' }} onClick={() => onChange([...media, { type: 'image', src: '' }])}>＋ Add media</button>
      </div>
    </Field>
  );
}

export default function ProjectsEditor({ repo }: { repo: string }) {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSlug, setNewSlug] = useState('');

  useEffect(() => {
    listProjects(repo).then(setProjects).catch((e) => setError(String(e)));
  }, [repo]);

  function update(id: string, patch: Partial<Project>) {
    setProjects((ps) => ps?.map((p) => (p.id === id ? { ...p, ...patch } : p)) ?? ps);
    setMsg(null);
  }

  async function saveAll() {
    if (!projects) return;
    setSaving(true);
    setError(null);
    setMsg(null);
    try {
      for (const p of projects) await saveProject(repo, p);
      setMsg('Saved ✓');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function removeOne(p: Project) {
    if (!confirm(`Delete project “${p.title}”? This blanks its JSON file.`)) return;
    try {
      await deleteProject(repo, p.id);
      setProjects((ps) => ps?.filter((x) => x.id !== p.id) ?? ps);
      setMsg(`Deleted “${p.title}”.`);
    } catch (e) {
      setError(String(e));
    }
  }

  async function create() {
    const slug = newSlug || slugify(newTitle);
    setError(null);
    try {
      const nextOrder = projects && projects.length ? Math.max(...projects.map((p) => p.order)) + 10 : 10;
      const project = await createProject(repo, slug, newTitle.trim(), nextOrder);
      setProjects((ps) => [...(ps ?? []), project]);
      setShowNew(false);
      setNewTitle('');
      setNewSlug('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="app">
      <div className="topbar">
        <h1 style={{ fontWeight: 400 }}>Projects</h1>
        <div className="spacer" />
        <button className="small ghost" onClick={() => setShowNew((v) => !v)}>＋ New project</button>
        <button className="primary small" onClick={saveAll} disabled={!projects || saving}>{saving ? 'Saving…' : 'Save'}</button>
      </div>

      <div className="content">
        <div className="container">
          <p className="screen-hint">Project cards shown on the homepage. Set display order with the number field, then Save.</p>
          {showNew && (
            <div className="inline-form">
              <div><label>Title</label><input value={newTitle} onChange={(e) => { setNewTitle(e.target.value); setNewSlug(slugify(e.target.value)); }} placeholder="My Project" /></div>
              <div><label>Slug (file name)</label><input value={newSlug} onChange={(e) => setNewSlug(e.target.value)} placeholder="my-project" /></div>
              <div className="row">
                <button className="primary" disabled={!newTitle.trim() || !newSlug} onClick={create}>Create</button>
                <button className="ghost" onClick={() => setShowNew(false)}>Cancel</button>
              </div>
            </div>
          )}

          {error && <div className="notice error">{error}</div>}
          {msg && <div className="notice ok">{msg}</div>}

          {projects === null ? (
            <div className="empty">Loading…</div>
          ) : projects.length === 0 ? (
            <div className="empty">No projects yet.</div>
          ) : (
            projects.map((p) => (
              <div className="tile" key={p.id}>
                <div className="tile-head">
                  <span className="tile-title">{p.title || p.id}</span>
                  <span className="block-id">{p.id}.json</span>
                  <ItemToolbar onDelete={() => removeOne(p)} />
                </div>

                <TextField label="Title" value={p.title} onChange={(v) => update(p.id, { title: v })} />
                <div className="grid2">
                  <Field label="Status">
                    <select value={p.status} onChange={(e) => update(p.id, { status: e.target.value })}>
                      {(STATUSES.includes(p.status) ? STATUSES : [p.status, ...STATUSES]).map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                  <Field label="Order (lower = first)">
                    <input type="number" value={p.order} onChange={(e) => update(p.id, { order: Number(e.target.value) })} />
                  </Field>
                </div>
                <ImageField label="Image" root={repo} value={p.image} onChange={(src) => update(p.id, { image: src })} onImport={() => importPublicImage(repo)} />
                <ProjectMediaEditor repo={repo} media={p.media} onChange={(media) => update(p.id, { media })} />
                <TextArea label="Description" value={p.description} onChange={(v) => update(p.id, { description: v })} />
                <TagsField label="Tags" value={p.tags} onChange={(v) => update(p.id, { tags: v })} />
                <div className="grid2">
                  <TextField label="GitHub URL" value={p.github ?? ''} placeholder="https://github.com/…" onChange={(v) => update(p.id, { github: v || null })} />
                  <TextField label="Live demo URL" value={p.deploymentUrl ?? ''} placeholder="https://…" onChange={(v) => update(p.id, { deploymentUrl: v || null })} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
