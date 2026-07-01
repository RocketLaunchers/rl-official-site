import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
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

/** Add/remove a key from a Set held in state (used for per-list collapse). */
function toggleInSet<T>(setState: Dispatch<SetStateAction<Set<T>>>, key: T) {
  setState((s) => {
    const n = new Set(s);
    if (n.has(key)) n.delete(key);
    else n.add(key);
    return n;
  });
}

/** Swap a list entry with its neighbor and renumber displayOrder by position. */
function reorder<T extends { displayOrder: number }>(list: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next.map((e, k) => ({ ...e, displayOrder: (k + 1) * 10 }));
}

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
  // Collapse state for the season's editable lists, so long seasons stay tidy.
  // Keyed by a stable id (member/advisor person, sponsor id) so it survives
  // reorder and delete.
  const [collapsedMembers, setCollapsedMembers] = useState<Set<string>>(new Set());
  const [collapsedSponsors, setCollapsedSponsors] = useState<Set<string>>(new Set());
  const [collapsedAdvisors, setCollapsedAdvisors] = useState<Set<string>>(new Set());
  const [advisorSort, setAdvisorSort] = useState<'order' | 'category' | 'name'>('order');

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
        if (initial) {
          setSelId(initial.id);
          setDraft(initial);
          // Start every card collapsed so a full season isn't a wall of forms.
          setCollapsedMembers(new Set(initial.roster.map((e) => e.person)));
          setCollapsedSponsors(new Set(initial.sponsors.map((e) => e.sponsor)));
          setCollapsedAdvisors(new Set(initial.advisors.map((e) => e.person)));
        }
      })
      .catch((e) => setError(String(e)));
  }, [repo]);

  function select(id: string) {
    const season = seasons?.find((s) => s.id === id) ?? null;
    setSelId(id);
    setDraft(season);
    setMsg(null);
    // Collapse every card by default when opening a season (keys are per-season).
    setCollapsedMembers(new Set(season?.roster.map((e) => e.person) ?? []));
    setCollapsedSponsors(new Set(season?.sponsors.map((e) => e.sponsor) ?? []));
    setCollapsedAdvisors(new Set(season?.advisors.map((e) => e.person) ?? []));
    setAdvisorSort('order');
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

  // Roster is stored as a flat array of (person, role) entries, but edited grouped
  // by person so a member with several roles is one card. The list is shown in the
  // same order the site uses — by role rank then subteam — so there are no manual
  // order numbers to juggle (see the Roles / Subteams editors to change ranks).
  const roleOrder = (id: string) => refs.roles.find((r) => r.id === id)?.displayOrder ?? 0;
  const subteamOrder = (id: string) => (id ? refs.subteams.find((s) => s.id === id)?.displayOrder ?? 0 : 0);
  const personName = (id: string) => refs.people.find((p) => p.id === id)?.name ?? id;
  // The composed title of one roster entry, e.g. "Avionics Lead" — used in the
  // collapsed member summary and the per-role heading.
  const previewOf = (entry: RosterEntry) => {
    const role = refs.roles.find((r) => r.id === entry.role);
    if (!role) return '';
    const subteam = refs.subteams.find((s) => s.id === entry.subteam);
    return role.scope === 'subteam' && subteam ? `${subteam.name} ${role.name}` : role.name;
  };
  const roster = draft?.roster ?? [];
  const rosterGroups: { person: string; items: { entry: RosterEntry; index: number }[] }[] = [];
  const groupOf = new Map<string, number>();
  roster.forEach((entry, index) => {
    let gi = groupOf.get(entry.person);
    if (gi === undefined) {
      gi = rosterGroups.length;
      groupOf.set(entry.person, gi);
      rosterGroups.push({ person: entry.person, items: [] });
    }
    rosterGroups[gi].items.push({ entry, index });
  });
  // Within a member, rank their roles; between members, rank by their top role.
  for (const g of rosterGroups) {
    g.items.sort((a, b) => roleOrder(a.entry.role) - roleOrder(b.entry.role) || subteamOrder(a.entry.subteam) - subteamOrder(b.entry.subteam));
  }
  const topRank = (g: { items: { entry: RosterEntry }[] }) => Math.min(...g.items.map((it) => roleOrder(it.entry.role)));
  rosterGroups.sort((a, b) => topRank(a) - topRank(b) || personName(a.person).localeCompare(personName(b.person)));
  const setRoster = (next: RosterEntry[]) => patch({ roster: next });
  const updateRole = (index: number, p: Partial<RosterEntry>) =>
    setRoster(roster.map((e, j) => (j === index ? { ...e, ...p } : e)));
  const removeRole = (index: number) => setRoster(roster.filter((_, j) => j !== index));
  // displayOrder is legacy on roster entries — team ordering now comes from role
  // rank, so new roles just store 0.
  const addRole = (person: string) =>
    setRoster([...roster, { person, role: refs.roles[0]?.id ?? '', subteam: '', displayOnTeam: true, displayOrder: 0 }]);
  const removeMember = (person: string) => setRoster(roster.filter((e) => e.person !== person));
  // Reassigning to a person who is already in the roster merges the two groups —
  // that person just ends up holding both sets of roles, which is allowed.
  const reassignMember = (from: string, to: string) => setRoster(roster.map((e) => (e.person === from ? { ...e, person: to } : e)));
  const addMember = () => {
    const used = new Set(roster.map((e) => e.person));
    const person = refs.people.find((p) => !used.has(p.id))?.id ?? refs.people[0]?.id ?? '';
    addRole(person);
  };
  // Default a new sponsor/advisor to a record not already used this season, so it
  // gets a fresh (expanded) card rather than colliding with a collapsed one.
  const addSponsor = () => {
    const used = new Set((draft?.sponsors ?? []).map((e) => e.sponsor));
    const sponsor = refs.sponsors.find((s) => !used.has(s.id))?.id ?? refs.sponsors[0]?.id ?? '';
    patch({ sponsors: [...(draft?.sponsors ?? []), { sponsor, tier: draft?.sponsorTiers[0] ?? '', supportTypes: [], publicDescription: '', showOnHomepage: true, displayOrder: ((draft?.sponsors.length ?? 0) + 1) * 10 }] });
  };
  const addAdvisor = () => {
    const used = new Set((draft?.advisors ?? []).map((e) => e.person));
    const person = refs.people.find((p) => !used.has(p.id))?.id ?? refs.people[0]?.id ?? '';
    patch({ advisors: [...(draft?.advisors ?? []), { person, category: 'Faculty Advisor', supportRole: '', description: '', featured: false, displayOrder: ((draft?.advisors.length ?? 0) + 1) * 10 }] });
  };

  // Collapse-all state per season list.
  const allMembersCollapsed = rosterGroups.length > 0 && rosterGroups.every((g) => collapsedMembers.has(g.person));
  const allSponsorsCollapsed = draft ? draft.sponsors.length > 0 && draft.sponsors.every((e) => collapsedSponsors.has(e.sponsor)) : false;
  const allAdvisorsCollapsed = draft ? draft.advisors.length > 0 && draft.advisors.every((e) => collapsedAdvisors.has(e.person)) : false;
  // Advisors are edited in a chosen order while keeping their real array index.
  const advisorView = (draft?.advisors ?? []).map((entry, index) => ({ entry, index }));
  if (advisorSort === 'category') advisorView.sort((a, b) => a.entry.category.localeCompare(b.entry.category) || personName(a.entry.person).localeCompare(personName(b.entry.person)));
  else if (advisorSort === 'name') advisorView.sort((a, b) => personName(a.entry.person).localeCompare(personName(b.entry.person)));

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
              'Build the Roster: “＋ Add member”, pick the Person, then set their Role (Lead / Co-Lead / Member, or an officer role) and — for subteam roles — the Subteam. Use “＋ Add another role” to give one person several roles (e.g. an officer who also leads a subteam); each role has its own on/off switch. The “Shows as:” line previews the title (e.g. “Avionics Lead”).',
              'Add Sponsors and Advisors the same way; the switches control homepage/team visibility.',
              'Long lists collapse to save space: click a member/sponsor/advisor’s ▸ to collapse it, or “Collapse all”. Reorder sponsors and advisors with ↑ / ↓; advisors also have a “Sort by” menu.',
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
              <div className="section-title" style={{ display: 'flex', alignItems: 'center' }}>
                <span>Roster · {rosterGroups.length} member{rosterGroups.length === 1 ? '' : 's'} · {draft.roster.length} role{draft.roster.length === 1 ? '' : 's'}</span>
                {rosterGroups.length > 0 && (
                  <button
                    className="small ghost"
                    style={{ marginLeft: 'auto' }}
                    onClick={() => setCollapsedMembers(allMembersCollapsed ? new Set() : new Set(rosterGroups.map((g) => g.person)))}
                  >
                    {allMembersCollapsed ? 'Expand all' : 'Collapse all'}
                  </button>
                )}
              </div>
              <p className="screen-hint">
                Add each person once, then give them one or more roles with “＋ Add another role”. Several
                people can share a role (e.g. two subteam leads), and one person can hold several (e.g. a
                Chief of Engineering who also leads Payload) — every role shows on the site. Lead / Co-Lead /
                Member combine with a subteam (e.g. “Avionics Lead”); officer roles (President, …) are
                org-wide and use no subteam. Turn a role’s switch off to hide just that one.
              </p>
              <p className="screen-hint">
                <strong>Ordering is automatic.</strong> The team page sorts officers by role rank, then
                subteam leads and members by subteam — the same way every season, so the history stays
                coherent. There are no per-person order numbers here: change the order of roles in the
                <em> Roles</em> editor (↑ / ↓) and of subteams in the <em>Subteams</em> editor.
              </p>
              {subteamsMissingLead.length > 0 && (
                <div className="notice warn">
                  No Lead assigned yet for: {subteamsMissingLead.map(subteamName).join(', ')}.
                </div>
              )}
              {rosterGroups.map((group) => {
                const person = refs.people.find((p) => p.id === group.person);
                const isCollapsed = collapsedMembers.has(group.person);
                const summary = group.items.map((it) => previewOf(it.entry)).filter(Boolean).join(', ');
                return (
                  <div className="block" key={group.person || '—unassigned—'}>
                    <div className="block-head">
                      <button className="small ghost tile-collapse" title={isCollapsed ? 'Expand' : 'Collapse'} onClick={() => toggleInSet(setCollapsedMembers, group.person)}>{isCollapsed ? '▸' : '▾'}</button>
                      <span className="entry-title tile-toggle" onClick={() => toggleInSet(setCollapsedMembers, group.person)}>
                        {person?.name ?? (group.person || 'New member')}
                      </span>
                      <span className="block-id">{group.items.length} role{group.items.length === 1 ? '' : 's'}{isCollapsed && summary ? ` · ${summary}` : ''}</span>
                      <ItemToolbar onDelete={() => removeMember(group.person)} deleteLabel="Remove member" />
                    </div>
                    {!isCollapsed && (<>
                    <Field label="Person">
                      <Picker value={group.person} onChange={(v) => reassignMember(group.person, v)} options={refs.people} label={(p) => p.name} />
                    </Field>
                    {group.items.map(({ entry, index }) => {
                      const role = refs.roles.find((r) => r.id === entry.role);
                      const subteamScoped = role?.scope === 'subteam';
                      const subteam = refs.subteams.find((s) => s.id === entry.subteam);
                      const needsSubteam = subteamScoped && !entry.subteam;
                      const preview = role ? (subteamScoped && subteam ? `${subteam.name} ${role.name}` : role.name) : '';
                      return (
                        <div className="role-row" key={index}>
                          <div className="block-head">
                            <span className="entry-title">Role{preview ? ` — ${preview}` : ''}</span>
                            <ItemToolbar onDelete={() => removeRole(index)} deleteLabel="Remove role" />
                          </div>
                          <div className="grid2">
                            <Field label="Role">
                              <Picker
                                value={entry.role}
                                onChange={(v) => {
                                  const next = refs.roles.find((r) => r.id === v);
                                  // Org-wide roles use no subteam — clear any stale value when switching.
                                  updateRole(index, next?.scope === 'subteam' ? { role: v } : { role: v, subteam: '' });
                                }}
                                options={refs.roles}
                                label={(r) => r.name}
                              />
                            </Field>
                            <Field label="Subteam">
                              {subteamScoped ? (
                                <Picker value={entry.subteam} onChange={(v) => updateRole(index, { subteam: v })} options={refs.subteams} label={(s) => s.name} allowBlank />
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
                            <Switch label="Show this role on the site" checked={entry.displayOnTeam} onChange={(v) => updateRole(index, { displayOnTeam: v })} />
                          </div>
                        </div>
                      );
                    })}
                    <button className="small ghost" onClick={() => addRole(group.person)}>＋ Add another role</button>
                    </>)}
                  </div>
                );
              })}
              <button className="small ghost" onClick={addMember}>＋ Add member</button>

              {/* ---- Sponsors ---- */}
              <div className="section-title" style={{ display: 'flex', alignItems: 'center' }}>
                <span>Sponsors ({draft.sponsors.length})</span>
                {draft.sponsors.length > 0 && (
                  <button
                    className="small ghost"
                    style={{ marginLeft: 'auto' }}
                    onClick={() => setCollapsedSponsors(allSponsorsCollapsed ? new Set() : new Set(draft.sponsors.map((e) => e.sponsor)))}
                  >
                    {allSponsorsCollapsed ? 'Expand all' : 'Collapse all'}
                  </button>
                )}
              </div>
              {draft.sponsors.map((entry, i) => {
                const set = (p: Partial<SponsorEntry>) => patch({ sponsors: draft.sponsors.map((e, j) => (j === i ? { ...e, ...p } : e)) });
                const isCollapsed = collapsedSponsors.has(entry.sponsor);
                const sponsorName = refs.sponsors.find((s) => s.id === entry.sponsor)?.name ?? entry.sponsor;
                return (
                  <div className="block" key={i}>
                    <div className="block-head">
                      <button className="small ghost tile-collapse" title={isCollapsed ? 'Expand' : 'Collapse'} onClick={() => toggleInSet(setCollapsedSponsors, entry.sponsor)}>{isCollapsed ? '▸' : '▾'}</button>
                      <span className="entry-title tile-toggle" onClick={() => toggleInSet(setCollapsedSponsors, entry.sponsor)}>{sponsorName || `Sponsor ${i + 1}`}</span>
                      <span className="block-id">{entry.tier || 'no tier'}</span>
                      <ItemToolbar
                        onUp={i > 0 ? () => patch({ sponsors: reorder(draft.sponsors, i, -1) }) : undefined}
                        onDown={i < draft.sponsors.length - 1 ? () => patch({ sponsors: reorder(draft.sponsors, i, 1) }) : undefined}
                        onDelete={() => patch({ sponsors: draft.sponsors.filter((_, j) => j !== i) })}
                        deleteLabel="Remove"
                      />
                    </div>
                    {!isCollapsed && (<>
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
                    </div>
                    </>)}
                  </div>
                );
              })}
              <button className="small ghost" onClick={addSponsor}>＋ Add sponsor</button>

              {/* ---- Advisors ---- */}
              <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span>Advisors &amp; mentors ({draft.advisors.length})</span>
                {draft.advisors.length > 1 && (
                  <label className="list-sort" style={{ marginLeft: 'auto' }}>
                    Sort by
                    <select value={advisorSort} onChange={(e) => setAdvisorSort(e.target.value as typeof advisorSort)}>
                      <option value="order">Manual order</option>
                      <option value="category">Category</option>
                      <option value="name">Name</option>
                    </select>
                  </label>
                )}
                {draft.advisors.length > 0 && (
                  <button
                    className="small ghost"
                    style={draft.advisors.length > 1 ? undefined : { marginLeft: 'auto' }}
                    onClick={() => setCollapsedAdvisors(allAdvisorsCollapsed ? new Set() : new Set(draft.advisors.map((e) => e.person)))}
                  >
                    {allAdvisorsCollapsed ? 'Expand all' : 'Collapse all'}
                  </button>
                )}
              </div>
              {advisorSort !== 'order' && (
                <p className="screen-hint">Sorted by {advisorSort} for browsing. Switch to “Manual order” to drag with ↑ / ↓; that manual order is what shows on the site.</p>
              )}
              {advisorView.map(({ entry, index: i }) => {
                const set = (p: Partial<AdvisorEntry>) => patch({ advisors: draft.advisors.map((e, j) => (j === i ? { ...e, ...p } : e)) });
                const isCollapsed = collapsedAdvisors.has(entry.person);
                const advisorName = refs.people.find((p) => p.id === entry.person)?.name ?? entry.person;
                const manual = advisorSort === 'order';
                return (
                  <div className="block" key={i}>
                    <div className="block-head">
                      <button className="small ghost tile-collapse" title={isCollapsed ? 'Expand' : 'Collapse'} onClick={() => toggleInSet(setCollapsedAdvisors, entry.person)}>{isCollapsed ? '▸' : '▾'}</button>
                      <span className="entry-title tile-toggle" onClick={() => toggleInSet(setCollapsedAdvisors, entry.person)}>{advisorName || `Advisor / mentor ${i + 1}`}</span>
                      <span className="block-id">{entry.category}</span>
                      <ItemToolbar
                        onUp={manual && i > 0 ? () => patch({ advisors: reorder(draft.advisors, i, -1) }) : undefined}
                        onDown={manual && i < draft.advisors.length - 1 ? () => patch({ advisors: reorder(draft.advisors, i, 1) }) : undefined}
                        onDelete={() => patch({ advisors: draft.advisors.filter((_, j) => j !== i) })}
                        deleteLabel="Remove"
                      />
                    </div>
                    {!isCollapsed && (<>
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
                    </div>
                    </>)}
                  </div>
                );
              })}
              <button className="small ghost" onClick={addAdvisor}>＋ Add advisor/mentor</button>

              <div className="section-title">End-of-year summary</div>
              <TextArea label="Summary (shown on archived seasons)" value={draft.endOfYearSummary} onChange={(v) => patch({ endOfYearSummary: v })} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
