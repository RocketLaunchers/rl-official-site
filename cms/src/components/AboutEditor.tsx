import { useEffect, useState } from 'react';
import { readAbout, saveAbout, importPublicImage, importPublicFile, type About } from '../api';
import { TRAIT_ICON_NAMES } from '@portfolio/content-schema';
import { Field, ImageField, ItemToolbar, StringListEditor, TextArea, TextField } from './fields';

type Trait = About['traits'][number];

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

  // paragraph helpers
  const setParas = (paragraphs: string[]) => patch({ paragraphs });
  const moveItem = <T,>(arr: T[], i: number, dir: -1 | 1): T[] => {
    const j = i + dir;
    if (j < 0 || j >= arr.length) return arr;
    const next = [...arr];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  };
  const updateTrait = (i: number, p: Partial<Trait>) => patch({ traits: data.traits.map((t, j) => (j === i ? { ...t, ...p } : t)) });

  async function pickResume() {
    const href = await importPublicFile(repo, ['pdf']);
    if (href) patch({ resume: { ...data!.resume, href } });
  }

  return (
    <div className="app">
      <div className="topbar">
        <h1 style={{ fontWeight: 400 }}>About</h1>
        <div className="spacer" />
        <button className="primary small" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </div>

      <div className="content">
        <div className="container">
          <p className="screen-hint">Your About section: profile, bio, traits, education, focus, and resume.</p>
          {error && <div className="notice error">{error}</div>}
          {msg && <div className="notice ok">{msg}</div>}

          <div className="section-title">Header & profile</div>
          <TextField label="Section title" value={data.sectionTitle} onChange={(v) => patch({ sectionTitle: v })} />
          <ImageField label="Profile image" root={repo} value={data.profileImage} onChange={(src) => patch({ profileImage: src })} onImport={() => importPublicImage(repo)} />
          <TextField label="Profile image alt" value={data.profileAlt} onChange={(v) => patch({ profileAlt: v })} />

          <div className="section-title">Bio paragraphs</div>
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

          <div className="section-title">Personality traits</div>
          {data.traits.map((t, i) => (
            <div className="tile" key={i}>
              <div className="tile-head">
                <span className="tile-title">{t.title || `Trait ${i + 1}`}</span>
                <ItemToolbar
                  onUp={() => patch({ traits: moveItem(data.traits, i, -1) })}
                  onDown={() => patch({ traits: moveItem(data.traits, i, 1) })}
                  onDelete={() => patch({ traits: data.traits.filter((_, j) => j !== i) })}
                />
              </div>
              <div className="grid2">
                <Field label="Icon">
                  <select value={t.icon} onChange={(e) => updateTrait(i, { icon: e.target.value })}>
                    {TRAIT_ICON_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </Field>
                <TextField label="Title" value={t.title} onChange={(v) => updateTrait(i, { title: v })} />
              </div>
              <TextArea label="Description" value={t.description} onChange={(v) => updateTrait(i, { description: v })} />
            </div>
          ))}
          <button className="small ghost" onClick={() => patch({ traits: [...data.traits, { icon: 'star', title: '', description: '' }] })}>＋ Add trait</button>

          <div className="section-title">Education & focus</div>
          <div className="grid2">
            <div>
              <TextField label="Education heading" value={data.education.title} onChange={(v) => patch({ education: { ...data.education, title: v } })} />
              <StringListEditor label="Education items" items={data.education.items} onChange={(items) => patch({ education: { ...data.education, items } })} />
            </div>
            <div>
              <TextField label="Focus heading" value={data.focus.title} onChange={(v) => patch({ focus: { ...data.focus, title: v } })} />
              <StringListEditor label="Focus items" items={data.focus.items} onChange={(items) => patch({ focus: { ...data.focus, items } })} />
            </div>
          </div>

          <div className="section-title">Resume</div>
          <Field label="Resume file (public path)">
            <div className="row">
              <input value={data.resume.href} placeholder="/resume.pdf" onChange={(e) => patch({ resume: { ...data.resume, href: e.target.value } })} />
              <button className="small" onClick={pickResume}>Import PDF…</button>
            </div>
          </Field>
          <div className="grid2">
            <TextField label="Download filename" value={data.resume.downloadName} onChange={(v) => patch({ resume: { ...data.resume, downloadName: v } })} />
            <TextField label="Button label" value={data.resume.label} onChange={(v) => patch({ resume: { ...data.resume, label: v } })} />
          </div>
        </div>
      </div>
    </div>
  );
}
