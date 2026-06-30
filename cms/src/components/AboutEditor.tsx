import { useEffect, useState } from 'react';
import { readAbout, saveAbout, type About } from '../api';
import { TRAIT_ICON_NAMES } from '@portfolio/content-schema';
import { Field, ImageField, ItemToolbar, StringListEditor, TextArea, TextField } from './fields';
import HelpPanel from './HelpPanel';

type Highlight = About['highlights'][number];

export default function AboutEditor({ repo }: { repo: string }) {
  const [data, setData] = useState<About | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    readAbout(repo).then(setData).catch((e) => setError(String(e)));
  }, [repo]);

  function patch(p: Partial<About>) {
    setData((d) => (d ? { ...d, ...p } : d));
    setMsg(null);
  }

  async function save() {
    if (!data) return;
    setSaving(true);
    setError(null);
    setMsg(null);
    try {
      await saveAbout(repo, data);
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
        <div className="topbar"><h1 style={{ fontWeight: 400 }}>About</h1></div>
        <div className="content"><div className="container">{error ? <div className="notice error">{error}</div> : <div className="empty">Loading…</div>}</div></div>
      </div>
    );
  }

  const setParas = (paragraphs: string[]) => patch({ paragraphs });
  const moveItem = <T,>(arr: T[], i: number, dir: -1 | 1): T[] => {
    const j = i + dir;
    if (j < 0 || j >= arr.length) return arr;
    const next = [...arr];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  };
  const updateHighlight = (i: number, p: Partial<Highlight>) =>
    patch({ highlights: data.highlights.map((t, j) => (j === i ? { ...t, ...p } : t)) });

  return (
    <div className="app">
      <div className="topbar">
        <h1 style={{ fontWeight: 400 }}>About</h1>
        <div className="spacer" />
        <button className="primary small" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </div>

      <div className="content">
        <div className="container">
          <p className="screen-hint">The “about the club” section: mission, highlights, stats, and the join CTA.</p>
          <HelpPanel
            intro="This is the “about the club” section on the homepage — your mission, the “what we do” cards, the stats, and the join call-to-action."
            steps={[
              'Edit the mission paragraphs (use the ↑ ↓ buttons to reorder).',
              'Add or edit the “what we do” highlight cards (icon + title + description).',
              'Update the “at a glance” stats.',
              'Edit the join / get-involved heading, body, and button.',
              'Click Save, then Publish.',
            ]}
          />
          {error && <div className="notice error">{error}</div>}
          {msg && <div className="notice ok">{msg}</div>}

          <div className="section-title">Header & image</div>
          <TextField label="Section title" value={data.sectionTitle} onChange={(v) => patch({ sectionTitle: v })} />
          <ImageField label="Image" root={repo} value={data.image} onChange={(src) => patch({ image: src })} />
          <TextField label="Image alt text" value={data.imageAlt} onChange={(v) => patch({ imageAlt: v })} />

          <div className="section-title">Mission paragraphs</div>
          <div style={{ display: 'grid', gap: 12 }}>
            {data.paragraphs.map((p, i) => (
              <div key={i} style={{ display: 'grid', gap: 6 }}>
                <textarea value={p} onChange={(e) => setParas(data.paragraphs.map((x, j) => (j === i ? e.target.value : x)))} />
                <ItemToolbar
                  onUp={() => setParas(moveItem(data.paragraphs, i, -1))}
                  onDown={() => setParas(moveItem(data.paragraphs, i, 1))}
                  onDelete={() => setParas(data.paragraphs.filter((_, j) => j !== i))}
                />
              </div>
            ))}
            <button className="small ghost" style={{ justifySelf: 'start' }} onClick={() => setParas([...data.paragraphs, ''])}>＋ Add paragraph</button>
          </div>

          <div className="section-title">Highlights (“what we do” cards)</div>
          {data.highlights.map((t, i) => (
            <div className="tile" key={i}>
              <div className="tile-head">
                <span className="tile-title">{t.title || `Highlight ${i + 1}`}</span>
                <ItemToolbar
                  onUp={() => patch({ highlights: moveItem(data.highlights, i, -1) })}
                  onDown={() => patch({ highlights: moveItem(data.highlights, i, 1) })}
                  onDelete={() => patch({ highlights: data.highlights.filter((_, j) => j !== i) })}
                />
              </div>
              <div className="grid2">
                <Field label="Icon">
                  <select value={t.icon} onChange={(e) => updateHighlight(i, { icon: e.target.value })}>
                    {TRAIT_ICON_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </Field>
                <TextField label="Title" value={t.title} onChange={(v) => updateHighlight(i, { title: v })} />
              </div>
              <TextArea label="Description" value={t.description} onChange={(v) => updateHighlight(i, { description: v })} />
            </div>
          ))}
          <button className="small ghost" onClick={() => patch({ highlights: [...data.highlights, { icon: 'rocket', title: '', description: '' }] })}>＋ Add highlight</button>

          <div className="section-title">At a glance (stats)</div>
          <TextField label="Stats heading" value={data.stats.title} onChange={(v) => patch({ stats: { ...data.stats, title: v } })} />
          <StringListEditor label="Stats items" items={data.stats.items} onChange={(items) => patch({ stats: { ...data.stats, items } })} placeholder="Founded 2024" />

          <div className="section-title">Join / get involved</div>
          <TextField label="Heading" value={data.join.title} onChange={(v) => patch({ join: { ...data.join, title: v } })} />
          <TextArea label="Body" value={data.join.body} onChange={(v) => patch({ join: { ...data.join, body: v } })} />
          <div className="grid2">
            <TextField label="Button label" value={data.join.ctaLabel} onChange={(v) => patch({ join: { ...data.join, ctaLabel: v } })} />
            <TextField label="Button link" value={data.join.ctaHref} placeholder="mailto:club@example.edu" onChange={(v) => patch({ join: { ...data.join, ctaHref: v } })} />
          </div>
        </div>
      </div>
    </div>
  );
}
