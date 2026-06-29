import { useEffect, useState } from 'react';
import {
  seasonsApi, peopleApi, rolesApi, subteamsApi, sponsorsApi, rocketsApi,
  type Season, type Person, type Role, type Subteam, type Sponsor, type Rocket,
} from '../api';
import { ADVISOR_CATEGORIES, type RosterEntry, type SponsorEntry, type AdvisorEntry } from '@portfolio/content-schema';
import { slugify } from '../util';
import { Field, StringListEditor, TextArea, TextField } from './fields';

const STATUSES = ['current', 'archived', 'upcoming'];

type Refs = { people: Person[]; roles: Role[]; subteams: Subteam[]; sponsors: Sponsor[]; rockets: Rocket[] };

function Picker<T extends { id: string }>({ value, onChange, options, label, allowBlank }: {
  value: string; onChange: (v: string) => void; options: T[]; label: (o: T) => string; allowBlank?: boolean;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {allowBlank && <option value="">— none —</option>}
      {options.map((o) => <option key={o.id} value={o.id}>{label(o)}</option>)}
      {value && !options.some((o) => o.id === value) && <option value={value}>{value} (missing)</option>}
    </select>
  );
}

export default function SeasonsEditor({ repo }: { repo: string }) {
  const [seasons, setSeasons] = useState<Season[] | null>(null);
  const [refs, setRefs] = useState<Refs | null>(null);
  const [selId, setSelId] = useState<string>('');
  const [draft, setDraft] = useState<Season | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newId, setNewId] = useState('');

  useEffect(() => {
    Promise.all([
      seasonsApi.list(repo), peopleApi.list(repo), rolesApi.list(repo),
      subteamsApi.list(repo), sponsorsApi.list(repo), rocketsApi.list(repo),
    ])
      .then(([s, people, roles, subteams, sponsors, rockets]) => {
        const sorted = [...s].sort((a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? ''));
        setSeasons(sorted);
        setRefs({ people, roles, subteams, sponsors, rockets });
        const initial = sorted.find((x) => x.status === 'current') ?? sorted[0];
        if (initial) { setSelId(initial.id); setDraft(initial); }
      })
      .catch((e) => setError(String(e)));
  }, [repo]);

  function select(id: string) {
    setSelId(id);
    setDraft(seasons?.find((s) => s.id === id) ?? null);
    setMsg(null);
  }
  const patch = (p: Partial<Season>) => { setDraft((d) => (d ? { ...d, ...p } : d)); setMsg(null); };

  async function save() {
    if (!draft) return;
    setSaving(true); setError(null); setMsg(null);
    try {
      const saved = await seasonsApi.save(repo, draft);
      setSeasons((xs) => xs?.map((s) => (s.id === saved.id ? saved : s)) ?? xs);
      setMsg('Saved ✓');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function createSeason() {
    const id = newId || slugify(newName);
    setError(null);
    try {
      const created = await seasonsApi.create(repo, { type: 'season', id, name: newName.trim() });
      setSeasons((xs) => [created, ...(xs ?? [])]);
      setShowNew(false); setNewName(''); setNewId('');
      select(created.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  if (error && !seasons) return <div className="app"><div className="content"><div className="container"><div className="notice error">{error}</div></div></div></div>;
  if (!seasons || !refs) return <div className="app"><div className="content"><div className="container"><div className="empty">Loading…</div></div></div></div>;

  return (
    <div className="app">
      <div className="topbar">
        <h1 style={{ fontWeight: 400 }}>Seasons</h1>
        <select value={selId} onChange={(e) => select(e.target.value)} style={{ width: 'auto', marginLeft: 12 }}>
          {seasons.map((s) => <option key={s.id} value={s.id}>{s.name}{s.status === 'current' ? ' (current)' : ''}</option>)}
        </select>
        <div className="spacer" />
        <button className="small ghost" onClick={() => setShowNew((v) => !v)}>＋ New season</button>
        <button className="primary small" onClick={save} disabled={!draft || saving}>{saving ? 'Saving…' : 'Save'}</button>
      </div>

      <div className="content">
        <div className="container">
          <p className="screen-hint">
            A season connects everything for one year. Pick records from the dropdowns — they come from the
            People, Roles, Subteams, Sponsors, and Rockets editors. Start a new year with “New season”.
          </p>

          {showNew && (
            <div className="inline-form">
              <div><label>Season name</label><input value={newName} placeholder="2026–2027 Season" onChange={(e) => { setNewName(e.target.value); setNewId(slugify(e.target.value)); }} /></div>
              <div><label>Id (e.g. 2026-2027)</label><input value={newId} onChange={(e) => setNewId(e.target.value)} placeholder="2026-2027" /></div>
              <div className="row">
                <button className="primary" disabled={!newName.trim() || !newId} onClick={createSeason}>Create</button>
                <button className="ghost" onClick={() => setShowNew(false)}>Cancel</button>
              </div>
            </div>
          )}

          {error && <div className="notice error">{error}</div>}
          {msg && <div className="notice ok">{msg}</div>}

          {!draft ? (
            <div className="empty">No seasons yet. Create one.</div>
          ) : (
            <>
              <div className="section-title">Season details</div>
              <div className="grid2">
                <TextField label="Name" value={draft.name} onChange={(v) => patch({ name: v })} />
                <Field label="Status">
                  <select value={draft.status} onChange={(e) => patch({ status: e.target.value as Season['status'] })}>
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
                <TextField label="Start date (YYYY-MM-DD)" value={draft.startDate ?? ''} onChange={(v) => patch({ startDate: v || undefined })} />
                <TextField label="End date (YYYY-MM-DD)" value={draft.endDate ?? ''} onChange={(v) => patch({ endDate: v || undefined })} />
                <TextField label="Theme / slogan" value={draft.theme} onChange={(v) => patch({ theme: v })} />
                <Field label="Current rocket">
                  <Picker value={draft.currentRocket} onChange={(v) => patch({ currentRocket: v })} options={refs.rockets} label={(r) => r.name} allowBlank />
                </Field>
              </div>

              <Field label="Active subteams this season">
                <div className="checkboxes">
                  {refs.subteams.map((st) => (
                    <label key={st.id}>
                      <input
                        type="checkbox"
                        checked={draft.subteams.includes(st.id)}
                        onChange={(e) => patch({ subteams: e.target.checked ? [...draft.subteams, st.id] : draft.subteams.filter((x) => x !== st.id) })}
                      /> {st.name}
                    </label>
                  ))}
                </div>
              </Field>

              <StringListEditor label="Sponsor tiers (in order)" items={draft.sponsorTiers} onChange={(sponsorTiers) => patch({ sponsorTiers })} placeholder="Gold" />

              {/* ---- Roster ---- */}
              <div className="section-title">Roster ({draft.roster.length})</div>
              {draft.roster.map((entry, i) => {
                const set = (p: Partial<RosterEntry>) => patch({ roster: draft.roster.map((e, j) => (j === i ? { ...e, ...p } : e)) });
                return (
                  <div className="block" key={i}>
                    <div className="row">
                      <Picker value={entry.person} onChange={(v) => set({ person: v })} options={refs.people} label={(p) => p.name} />
                      <Picker value={entry.role} onChange={(v) => set({ role: v })} options={refs.roles} label={(r) => r.name} />
                      <Picker value={entry.subteam} onChange={(v) => set({ subteam: v })} options={refs.subteams} label={(s) => s.name} allowBlank />
                      <button className="small danger" onClick={() => patch({ roster: draft.roster.filter((_, j) => j !== i) })}>✕</button>
                    </div>
                    <div className="checkboxes" style={{ marginTop: 8 }}>
                      <label><input type="checkbox" checked={entry.displayOnTeam} onChange={(e) => set({ displayOnTeam: e.target.checked })} /> Show on team page</label>
                      <label>Order <input type="number" value={entry.displayOrder} style={{ width: 70 }} onChange={(e) => set({ displayOrder: Number(e.target.value) })} /></label>
                    </div>
                  </div>
                );
              })}
              <button className="small ghost" onClick={() => patch({ roster: [...draft.roster, { person: refs.people[0]?.id ?? '', role: refs.roles[0]?.id ?? '', subteam: '', displayOnTeam: true, displayOrder: (draft.roster.length + 1) * 10 }] })}>＋ Add roster entry</button>

              {/* ---- Sponsors ---- */}
              <div className="section-title">Sponsors ({draft.sponsors.length})</div>
              {draft.sponsors.map((entry, i) => {
                const set = (p: Partial<SponsorEntry>) => patch({ sponsors: draft.sponsors.map((e, j) => (j === i ? { ...e, ...p } : e)) });
                return (
                  <div className="block" key={i}>
                    <div className="row">
                      <Picker value={entry.sponsor} onChange={(v) => set({ sponsor: v })} options={refs.sponsors} label={(s) => s.name} />
                      <select value={entry.tier} onChange={(e) => set({ tier: e.target.value })} style={{ width: 140 }}>
                        <option value="">— tier —</option>
                        {draft.sponsorTiers.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <input value={entry.supportTypes.join(', ')} placeholder="Money, Materials" onChange={(e) => set({ supportTypes: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />
                      <button className="small danger" onClick={() => patch({ sponsors: draft.sponsors.filter((_, j) => j !== i) })}>✕</button>
                    </div>
                    <input value={entry.publicDescription} placeholder="Public description" style={{ marginTop: 8 }} onChange={(e) => set({ publicDescription: e.target.value })} />
                    <div className="checkboxes" style={{ marginTop: 8 }}>
                      <label><input type="checkbox" checked={entry.showOnHomepage} onChange={(e) => set({ showOnHomepage: e.target.checked })} /> Show on homepage</label>
                      <label>Order <input type="number" value={entry.displayOrder} style={{ width: 70 }} onChange={(e) => set({ displayOrder: Number(e.target.value) })} /></label>
                    </div>
                  </div>
                );
              })}
              <button className="small ghost" onClick={() => patch({ sponsors: [...draft.sponsors, { sponsor: refs.sponsors[0]?.id ?? '', tier: draft.sponsorTiers[0] ?? '', supportTypes: [], publicDescription: '', showOnHomepage: true, displayOrder: (draft.sponsors.length + 1) * 10 }] })}>＋ Add sponsor</button>

              {/* ---- Advisors ---- */}
              <div className="section-title">Advisors &amp; mentors ({draft.advisors.length})</div>
              {draft.advisors.map((entry, i) => {
                const set = (p: Partial<AdvisorEntry>) => patch({ advisors: draft.advisors.map((e, j) => (j === i ? { ...e, ...p } : e)) });
                return (
                  <div className="block" key={i}>
                    <div className="row">
                      <Picker value={entry.person} onChange={(v) => set({ person: v })} options={refs.people} label={(p) => p.name} />
                      <select value={entry.category} onChange={(e) => set({ category: e.target.value as AdvisorEntry['category'] })} style={{ width: 180 }}>
                        {ADVISOR_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <button className="small danger" onClick={() => patch({ advisors: draft.advisors.filter((_, j) => j !== i) })}>✕</button>
                    </div>
                    <input value={entry.supportRole} placeholder="Support role" style={{ marginTop: 8 }} onChange={(e) => set({ supportRole: e.target.value })} />
                    <TextArea value={entry.description} onChange={(v) => set({ description: v })} />
                    <div className="checkboxes">
                      <label><input type="checkbox" checked={entry.featured} onChange={(e) => set({ featured: e.target.checked })} /> Featured</label>
                      <label>Order <input type="number" value={entry.displayOrder} style={{ width: 70 }} onChange={(e) => set({ displayOrder: Number(e.target.value) })} /></label>
                    </div>
                  </div>
                );
              })}
              <button className="small ghost" onClick={() => patch({ advisors: [...draft.advisors, { person: refs.people[0]?.id ?? '', category: 'Faculty Advisor', supportRole: '', description: '', featured: false, displayOrder: (draft.advisors.length + 1) * 10 }] })}>＋ Add advisor/mentor</button>

              <div className="section-title">End-of-year summary</div>
              <TextArea label="Summary (shown on archived seasons)" value={draft.endOfYearSummary} onChange={(v) => patch({ endOfYearSummary: v })} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
