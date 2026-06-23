import { useEffect, useState } from 'react';
import { readSite, saveSite, type Site } from '../api';
import { Field, ItemToolbar, StringListEditor, TextField } from './fields';

// Friendly homepage destinations a CTA button can scroll to. The underlying
// section ids are an implementation detail and are not exposed for editing.
const DESTINATIONS = [
  { id: 'hero', label: 'Top of page' },
  { id: 'blog', label: 'Blog' },
  { id: 'projects', label: 'Projects' },
  { id: 'about', label: 'About' },
  { id: 'gallery', label: 'Community' },
];

/**
 * Edits the global site settings: the title page (name, role, headline lines,
 * CTA buttons), the external/social links used across the site, and the footer.
 */
export default function HomeEditor({ repo }: { repo: string }) {
  const [data, setData] = useState<Site | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    readSite(repo).then(setData).catch((e) => setError(String(e)));
  }, [repo]);

  function patch(p: Partial<Site>) {
    setData((d) => (d ? { ...d, ...p } : d));
    setMsg(null);
  }

  async function save() {
    if (!data) return;
    setSaving(true);
    setError(null);
    setMsg(null);
    try {
      await saveSite(repo, data);
      setMsg('Saved ✓');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  if (!data) {
    return (
      <div className="app">
        <div className="topbar"><h1 style={{ fontWeight: 400 }}>Home</h1></div>
        <div className="content"><div className="container">{error ? <div className="notice error">{error}</div> : <div className="empty">Loading…</div>}</div></div>
      </div>
    );
  }

  const setCta = (i: number, p: Partial<Site['ctas'][number]>) =>
    patch({ ctas: data.ctas.map((c, j) => (j === i ? { ...c, ...p } : c)) });
  const moveCta = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= data.ctas.length) return;
    const next = [...data.ctas];
    [next[i], next[j]] = [next[j], next[i]];
    patch({ ctas: next });
  };

  return (
    <div className="app">
      <div className="topbar">
        <h1 style={{ fontWeight: 400 }}>Home</h1>
        <div className="spacer" />
        <button className="primary small" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </div>

      <div className="content">
        <div className="container">
          <p className="screen-hint">The homepage title section, your external links, and the footer.</p>
          {error && <div className="notice error">{error}</div>}
          {msg && <div className="notice ok">{msg}</div>}

          <div className="section-title">Title page</div>
          <TextField label="Name" value={data.name} onChange={(v) => patch({ name: v })} />
          <TextField label="Role / subtitle" value={data.role} onChange={(v) => patch({ role: v })} />
          <StringListEditor label="Headline lines" items={data.headlines} onChange={(headlines) => patch({ headlines })} placeholder="DEVELOPER." />

          <div className="section-title">Call-to-action buttons</div>
          {data.ctas.map((c, i) => (
            <div className="tile" key={i}>
              <div className="tile-head">
                <span className="tile-title">{c.label || `Button ${i + 1}`}</span>
                <ItemToolbar
                  onUp={() => moveCta(i, -1)}
                  onDown={() => moveCta(i, 1)}
                  onDelete={() => patch({ ctas: data.ctas.filter((_, j) => j !== i) })}
                />
              </div>
              <div className="grid2">
                <TextField label="Label" value={c.label} onChange={(v) => setCta(i, { label: v })} />
                <Field label="Goes to">
                  <select value={c.target} onChange={(e) => setCta(i, { target: e.target.value })}>
                    {DESTINATIONS.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
                  </select>
                </Field>
              </div>
            </div>
          ))}
          <button className="small ghost" onClick={() => patch({ ctas: [...data.ctas, { label: '', target: 'blog' }] })}>＋ Add button</button>

          <div className="section-title">Links</div>
          <div className="grid2">
            <TextField label="GitHub URL" value={data.links.github} placeholder="https://github.com/…" onChange={(v) => patch({ links: { ...data.links, github: v } })} />
            <TextField label="LinkedIn URL" value={data.links.linkedin} placeholder="https://linkedin.com/in/…" onChange={(v) => patch({ links: { ...data.links, linkedin: v } })} />
            <TextField label="X / Twitter URL" value={data.links.twitter} placeholder="https://x.com/…" onChange={(v) => patch({ links: { ...data.links, twitter: v } })} />
            <TextField label="Email address" value={data.links.email} placeholder="you@example.com" onChange={(v) => patch({ links: { ...data.links, email: v } })} />
          </div>

          <div className="section-title">Footer</div>
          <div className="grid2">
            <TextField label="Copyright line" value={data.footer.copyright} onChange={(v) => patch({ footer: { ...data.footer, copyright: v } })} />
            <TextField label="Secondary line" value={data.footer.rights} onChange={(v) => patch({ footer: { ...data.footer, rights: v } })} />
          </div>
        </div>
      </div>
    </div>
  );
}
