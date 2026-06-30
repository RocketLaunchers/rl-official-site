import { useEffect, useState } from 'react';
import { readSite, saveSite, type Site } from '../api';
import { Field, ItemToolbar, StringListEditor, TextField } from './fields';
import HelpPanel from './HelpPanel';

// Friendly homepage destinations a CTA button can scroll to, plus routed pages.
const DESTINATIONS = [
  { id: 'hero', label: 'Top of page' },
  { id: 'about', label: 'About / Mission' },
  { id: 'team', label: 'Team' },
  { id: 'subteams', label: 'Subteams' },
  { id: 'rocket', label: 'Current rocket' },
  { id: 'sponsors', label: 'Sponsors' },
  { id: 'news', label: 'News' },
  { id: 'join', label: 'Join' },
  { id: '/rockets', label: 'Rockets page' },
  { id: '/team', label: 'Team page' },
  { id: '/sponsors', label: 'Sponsors page' },
  { id: '/constitution', label: 'Constitution page' },
];

const LINK_FIELDS: { key: keyof Site['links']; label: string; placeholder: string }[] = [
  { key: 'github', label: 'GitHub URL', placeholder: 'https://github.com/…' },
  { key: 'linkedin', label: 'LinkedIn URL', placeholder: 'https://linkedin.com/company/…' },
  { key: 'instagram', label: 'Instagram URL', placeholder: 'https://instagram.com/…' },
  { key: 'youtube', label: 'YouTube URL', placeholder: 'https://youtube.com/@…' },
  { key: 'discord', label: 'Discord invite', placeholder: 'https://discord.gg/…' },
  { key: 'email', label: 'Email address', placeholder: 'club@example.edu' },
];

/** Edits global site settings: org name/tagline, hero headlines, CTAs, links, footer. */
export default function SiteEditor({ repo }: { repo: string }) {
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
        <div className="topbar"><h1 style={{ fontWeight: 400 }}>Site</h1></div>
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
        <h1 style={{ fontWeight: 400 }}>Site</h1>
        <div className="spacer" />
        <button className="primary small" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </div>

      <div className="content">
        <div className="container">
          <p className="screen-hint">The hero/title section, external links, and footer for the whole site.</p>
          <HelpPanel
            intro="These settings appear across the whole site — the big hero text at the top, the call-to-action buttons, your social links, and the footer."
            steps={[
              'Edit the organization name, tagline, and headline lines for the hero.',
              'Add or reorder call-to-action buttons; “Goes to” sets where each one scrolls/links.',
              'Fill in your social links (anything left blank is hidden).',
              'Update the footer text.',
              'Click Save, then Publish.',
            ]}
          />
          {error && <div className="notice error">{error}</div>}
          {msg && <div className="notice ok">{msg}</div>}

          <div className="section-title">Hero</div>
          <TextField label="Organization name" value={data.name} onChange={(v) => patch({ name: v })} />
          <TextField label="Tagline" value={data.tagline} onChange={(v) => patch({ tagline: v })} />
          <StringListEditor label="Headline lines" items={data.headlines} onChange={(headlines) => patch({ headlines })} placeholder="DESIGN." />

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
                    {data.ctas[i].target && !DESTINATIONS.some((d) => d.id === data.ctas[i].target) && (
                      <option value={data.ctas[i].target}>{data.ctas[i].target}</option>
                    )}
                  </select>
                </Field>
              </div>
            </div>
          ))}
          <button className="small ghost" onClick={() => patch({ ctas: [...data.ctas, { label: '', target: 'join' }] })}>＋ Add button</button>

          <div className="section-title">Links</div>
          <div className="grid2">
            {LINK_FIELDS.map((f) => (
              <TextField key={f.key} label={f.label} value={data.links[f.key]} placeholder={f.placeholder} onChange={(v) => patch({ links: { ...data.links, [f.key]: v } })} />
            ))}
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
