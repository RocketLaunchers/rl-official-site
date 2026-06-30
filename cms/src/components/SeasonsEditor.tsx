import { useEffect, useState } from 'react';
import {
  seasonsApi, peopleApi, rolesApi, subteamsApi, sponsorsApi, rocketsApi,
  countReferences, renameRecord,
  type Season, type Person, type Role, type Subteam, type Sponsor, type Rocket,
} from '../api';
import { ADVISOR_CATEGORIES, type RosterEntry, type SponsorEntry, type AdvisorEntry } from '@portfolio/content-schema';
import { slugify } from '../util';
import { Field, ItemToolbar, StringListEditor, Switch, TextArea, TextField } from './fields';
import HelpPanel from './HelpPanel';

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
  const [renaming, setRenaming] = useState(false);
  const [renameTo, setRenameTo] = useState('');
  const [renameRefs, setRenameRefs] = useState<number | null>(null);
  const [renameBusy, setRenameBusy] = useState(false);

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

  function openRename() {
    if (!draft) return;
    setError(null); setMsg(null);
    setRenaming(true);
    setRenameTo(slugify(draft.name) || draft.id);
    setRenameRefs(null);
    countReferences(repo, 'season', draft.id).then(setRenameRefs).catch(() => setRenameRefs(null));
  }

  async function doRenameSeason() {
    if (!draft) return;
    const to = renameTo.trim();
    setRenameBusy(true); setError(null); setMsg(null);
    try {
      const saved = await seasonsApi.save(repo, draft); // persist edits before the file moves
      const { refs } = await renameRecord(repo, seasonsApi, saved, to);
      const list = await seasonsApi.list(repo);
      const sorted = [...list].sort((a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? ''));
      setSeasons(sorted);
      setSelId(to);
      setDraft(sorted.find((s) => s.id === to) ?? null);
      setRenaming(false);
      setMsg(`Renamed season → “${to}”${refs ? ` · updated ${refs} reference${refs === 1 ? '' : 's'}` : ''}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRenameBusy(false);
    }
  }

  if (error && !seasons) return <div className="app"><div className="content"><div className="container"><div className="notice error">{error}</div></div></div></div>;
  if (!seasons || !refs) return <div className="app"><div className="content"><div className="container"><div className="empty">Loading…</div></div></div></div>;

  // Subteam-scoped leadership roles (Lead / Co-Lead) — used to flag active subteams with no lead.
  const leadRoleIds = new Set(refs.roles.filter((r) => r.scope === 'subteam' && r.isLeadership).map((r) => r.id));
  const coveredSubteams = new Set((draft?.roster ?? []).filter((e) => leadRoleIds.has(e.role) && e.subteam).map((e) => e.subteam));
  const subteamsMissingLead = (draft?.subteams ?? []).filter((id) => !coveredSubteams.has(id));
  const subteamName = (id: string) => refs.subteams.find((s) => s.id === id)?.name ?? id;

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
          <HelpPanel
            intro="A season ties everything together for one year: the roster (who is on the team and their roles), active subteams, sponsors, advisors, and the current rocket. The people, roles, sponsors, etc. must already exist in their own tabs first."
            steps={[
              'Use the dropdown up top to pick a season, or click “＋ New season” to start a year.',
              'Set Status to “current” for the active year (set last year’s to “archived”).',
              'Tick which subteams are active under “Active subteams this season”.',
              'Build the Roster: “＋ Add roster entry”, choose a Person, a Role level (Lead / Co-Lead / Member, or an officer role), and — for subteam roles — the Subteam. The “Shows as:” line previews the title (e.g. “Avionics Lead”).',
              'Add Sponsors and Advisors the same way; the switches control homepage/team visibility.',
              'Click Save, then Publish.',
            ]}
          />

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
              <div className="tile-head" style={{ marginBottom: 12 }}>
                <span className="block-id">{draft.id}.json</span>
                <button className="small ghost" title="Rename the season id and update everything that references it" onClick={() => (renaming ? setRenaming(false) : openRename())}>✎ Rename ID</button>
              </div>
              {renaming && (
                <div className="inline-form">
                  <div>
                    <label>New id (file name)</label>
                    <input value={renameTo} autoFocus placeholder="2026-2027" onChange={(e) => setRenameTo(e.target.value)} />
                  </div>
                  <p className="screen-hint" style={{ margin: 0 }}>
                    {renameRefs === null ? 'Checking references…' : `Will update ${renameRefs} reference${renameRefs === 1 ? '' : 's'} across other content.`}
                  </p>
                  <div className="row">
                    <button className="primary" disabled={renameBusy || !renameTo.trim() || renameTo.trim() === draft.id} onClick={doRenameSeason}>{renameBusy ? 'Renaming…' : 'Rename'}</button>
                    <button className="ghost" disabled={renameBusy} onClick={() => setRenaming(false)}>Cancel</button>
                  </div>
                </div>
              )}
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
              <p className="screen-hint">
                Pick a position level (Lead / Co-Lead / Member) and the subteam — the team page shows them
                combined, e.g. “Avionics Lead”. Officer roles (President, …) are org-wide and use no subteam.
              </p>
              {subteamsMissingLead.length > 0 && (
                <div className="notice warn">
                  No Lead assigned yet for: {subteamsMissingLead.map(subteamName).join(', ')}.
                </div>
              )}
              {draft.roster.map((entry, i) => {
                const set = (p: Partial<RosterEntry>) => patch({ roster: draft.roster.map((e, j) => (j === i ? { ...e, ...p } : e)) });
                const role = refs.roles.find((r) => r.id === entry.role);
                const subteamScoped = role?.scope === 'subteam';
                const subteam = refs.subteams.find((s) => s.id === entry.subteam);
                const needsSubteam = subteamScoped && !entry.subteam;
                const preview = role ? (subteamScoped && subteam ? `${subteam.name} ${role.name}` : role.name) : '';
                return (
                  <div className="block" key={i}>
                    <div className="block-head">
                      <span className="entry-title">Member {i + 1}{preview ? ` — ${preview}` : ''}</span>
                      <ItemToolbar onDelete={() => patch({ roster: draft.roster.filter((_, j) => j !== i) })} deleteLabel="Remove" />
                    </div>
                    <div className="grid3">
                      <Field label="Person"><Picker value={entry.person} onChange={(v) => set({ person: v })} options={refs.people} label={(p) => p.name} /></Field>
                      <Field label="Role">
                        <Picker
                          value={entry.role}
                          onChange={(v) => {
                            const next = refs.roles.find((r) => r.id === v);
                            // Org-wide roles use no subteam — clear any stale value when switching to one.
                            set(next?.scope === 'subteam' ? { role: v } : { role: v, subteam: '' });
                          }}
                          options={refs.roles}
                          label={(r) => r.name}
                        />
                      </Field>
                      <Field label="Subteam">
                        {subteamScoped ? (
                          <Picker value={entry.subteam} onChange={(v) => set({ subteam: v })} options={refs.subteams} label={(s) => s.name} allowBlank />
                        ) : (
                          <div className="muted" style={{ fontSize: 13, padding: '8px 2px' }}>Org-wide role — no subteam</div>
                        )}
                      </Field>
                    </div>
                    {needsSubteam ? (
                      <div className="notice warn" style={{ margin: '0 0 10px' }}>⚠ Pick a subteam — this is a {role?.name} position.</div>
                    ) : preview ? (
                      <p className="muted" style={{ fontSize: 13, margin: '0 0 10px' }}>Shows as: <strong>{preview}</strong></p>
                    ) : null}
                    <div className="checkboxes">
                      <Switch label="Show on team page" checked={entry.displayOnTeam} onChange={(v) => set({ displayOnTeam: v })} />
                      <label>Order <input type="number" value={entry.displayOrder} onChange={(e) => set({ displayOrder: Number(e.target.value) })} /></label>
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
                    <div className="block-head">
                      <span className="entry-title">Sponsor {i + 1}</span>
                      <ItemToolbar onDelete={() => patch({ sponsors: draft.sponsors.filter((_, j) => j !== i) })} deleteLabel="Remove" />
                    </div>
                    <div className="grid3">
                      <Field label="Sponsor"><Picker value={entry.sponsor} onChange={(v) => set({ sponsor: v })} options={refs.sponsors} label={(s) => s.name} /></Field>
                      <Field label="Tier">
                        <select value={entry.tier} onChange={(e) => set({ tier: e.target.value })}>
                          <option value="">— tier —</option>
                          {draft.sponsorTiers.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </Field>
                      <Field label="Support types">
                        <input value={entry.supportTypes.join(', ')} placeholder="Money, Materials" onChange={(e) => set({ supportTypes: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />
                      </Field>
                    </div>
                    <TextField label="Public description" value={entry.publicDescription} onChange={(v) => set({ publicDescription: v })} />
                    <div className="checkboxes">
                      <Switch label="Show on homepage" checked={entry.showOnHomepage} onChange={(v) => set({ showOnHomepage: v })} />
                      <label>Order <input type="number" value={entry.displayOrder} onChange={(e) => set({ displayOrder: Number(e.target.value) })} /></label>
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
                    <div className="block-head">
                      <span className="entry-title">Advisor / mentor {i + 1}</span>
                      <ItemToolbar onDelete={() => patch({ advisors: draft.advisors.filter((_, j) => j !== i) })} deleteLabel="Remove" />
                    </div>
                    <div className="grid2">
                      <Field label="Person"><Picker value={entry.person} onChange={(v) => set({ person: v })} options={refs.people} label={(p) => p.name} /></Field>
                      <Field label="Category">
                        <select value={entry.category} onChange={(e) => set({ category: e.target.value as AdvisorEntry['category'] })}>
                          {ADVISOR_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </Field>
                    </div>
                    <TextField label="Support role" value={entry.supportRole} onChange={(v) => set({ supportRole: v })} />
                    <TextArea label="Description" value={entry.description} onChange={(v) => set({ description: v })} />
                    <div className="checkboxes">
                      <Switch label="Featured" checked={entry.featured} onChange={(v) => set({ featured: v })} />
                      <label>Order <input type="number" value={entry.displayOrder} onChange={(e) => set({ displayOrder: Number(e.target.value) })} /></label>
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
