import { useEffect, useState, type CSSProperties } from 'react';
import {
  seasonsApi, rocketsApi, peopleApi, sponsorsApi, subteamsApi, constitutionApi,
  type Season, type Rocket, type Person, type Sponsor, type Subteam, type Constitution,
} from '../api';
import { SECTION_COLOR, type Section } from '../nav';
import { Icon, type IconName } from './icons';

type Data = {
  seasons: Season[];
  rockets: Rocket[];
  people: Person[];
  sponsors: Sponsor[];
  subteams: Subteam[];
  constitutions: Constitution[];
};

type Warning = { msg: string; section: Section };

/** Quick links to the most common "I want to add something" tasks. */
const QUICK_ACTIONS: { label: string; section: Section; icon: IconName }[] = [
  { label: 'Add a member', section: 'people', icon: 'people' },
  { label: 'Manage roles', section: 'roles', icon: 'roles' },
  { label: 'Build the roster', section: 'seasons', icon: 'seasons' },
  { label: 'Add an event', section: 'events', icon: 'events' },
  { label: 'Write news', section: 'news', icon: 'news' },
  { label: 'Add a sponsor', section: 'sponsors', icon: 'sponsors' },
  { label: 'Publish changes', section: 'publish', icon: 'publish' },
];

/** Compute "missing content" warnings for the current season, each linked to the tab that fixes it. */
function computeWarnings(d: Data): Warning[] {
  const w: Warning[] = [];
  const current = d.seasons.find((s) => s.status === 'current');
  if (!current) {
    w.push({ msg: 'No season is marked “current”.', section: 'seasons' });
    return w;
  }
  const byId = <T extends { id: string }>(xs: T[], id: string) => xs.find((x) => x.id === id);

  if (!current.currentRocket) w.push({ msg: `${current.name} has no current rocket set.`, section: 'seasons' });
  else {
    const rocket = byId(d.rockets, current.currentRocket);
    if (!rocket) w.push({ msg: `Current rocket "${current.currentRocket}" has no rocket record.`, section: 'rockets' });
    else if ((rocket.status === 'Launched' || rocket.status === 'Retired') && !rocket.results.trim())
      w.push({ msg: `${rocket.name} has no launch result recorded.`, section: 'rockets' });
  }

  if (!current.advisors.some((a) => a.category === 'Faculty Advisor'))
    w.push({ msg: `${current.name} has no faculty advisor assigned.`, section: 'seasons' });
  if (current.roster.length === 0) w.push({ msg: `${current.name} has an empty roster.`, section: 'seasons' });

  if (!d.constitutions.some((c) => c.status === 'current')) w.push({ msg: 'No constitution is marked “current”.', section: 'constitution' });

  for (const entry of current.sponsors) {
    const sp = byId(d.sponsors, entry.sponsor);
    if (sp && !sp.logo) w.push({ msg: `Sponsor “${sp.name}” has no logo.`, section: 'sponsors' });
  }

  for (const id of current.subteams) {
    const st = byId(d.subteams, id);
    if (st && !st.shortDescription.trim()) w.push({ msg: `Subteam “${st.name}” has no description yet.`, section: 'subteams' });
  }

  const missingPhotos = current.roster
    .map((r) => byId(d.people, r.person))
    .filter((p): p is Person => !!p && p.privacy.showPhoto && !p.photo);
  if (missingPhotos.length) w.push({ msg: `${missingPhotos.length} team member(s) missing a photo.`, section: 'people' });

  return w;
}

export default function Dashboard({ repo, onNavigate }: { repo: string; onNavigate: (s: Section) => void }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      seasonsApi.list(repo), rocketsApi.list(repo), peopleApi.list(repo),
      sponsorsApi.list(repo), subteamsApi.list(repo), constitutionApi.list(repo),
    ])
      .then(([seasons, rockets, people, sponsors, subteams, constitutions]) =>
        setData({ seasons, rockets, people, sponsors, subteams, constitutions }))
      .catch((e) => setError(String(e)));
  }, [repo]);

  const current = data?.seasons.find((s) => s.status === 'current');
  const rocket = current && data ? data.rockets.find((r) => r.id === current.currentRocket) : undefined;
  const warnings = data ? computeWarnings(data) : [];

  return (
    <div className="app">
      <div className="topbar"><h1 style={{ fontWeight: 400 }}>Dashboard</h1></div>
      <div className="content">
        <div className="container">
          <div className="section-title">Quick actions</div>
          <div className="quick-actions">
            {QUICK_ACTIONS.map((a) => (
              <button
                key={a.section + a.label}
                className="quick-action"
                style={{ '--c': SECTION_COLOR[a.section] } as CSSProperties}
                onClick={() => onNavigate(a.section)}
              >
                <span className="qa-ico"><Icon name={a.icon} size={16} /></span>
                {a.label}
              </button>
            ))}
          </div>

          <button className="help-cta" onClick={() => onNavigate('help')}>
            <span className="hc-ico"><Icon name="help" size={20} /></span>
            <span className="hc-text">
              <b>New here?</b> Open the Help guide for step-by-step instructions on every common task.
            </span>
            <span className="hc-go"><Icon name="arrow" size={16} /></span>
          </button>

          <button className="help-cta media-cta" onClick={() => onNavigate('assets')}>
            <span className="hc-ico"><Icon name="media" size={20} /></span>
            <span className="hc-text">
              <b>One home for media.</b> Photos, videos, 3D models, and PDFs are uploaded once in <b>Tools → Assets</b> — then you pick them from any editor. New files only come in there, so the project stays organized.
            </span>
            <span className="hc-go"><Icon name="arrow" size={16} /></span>
          </button>

          {error && <div className="notice error">{error}</div>}
          {!data ? (
            <div className="empty">Loading…</div>
          ) : (
            <>
              <div className="section-title">Current season</div>
              {current ? (
                <div className="tile">
                  <div className="tile-head">
                    <span className="tile-title">{current.name}</span>
                    <span className="block-id">{current.theme}</span>
                  </div>
                  <div className="grid2">
                    <div><label>Current rocket</label><div>{rocket ? `${rocket.name} (${rocket.status})` : '—'}</div></div>
                    <div><label>Roster</label><div>{current.roster.length} member(s)</div></div>
                    <div><label>Subteams</label><div>{current.subteams.length} active</div></div>
                    <div><label>Sponsors</label><div>{current.sponsors.length}</div></div>
                    <div><label>Advisors &amp; mentors</label><div>{current.advisors.length}</div></div>
                    <div><label>Content totals</label><div>{data.people.length} people · {data.rockets.length} rockets</div></div>
                  </div>
                </div>
              ) : (
                <div className="empty">No current season. Create one in the Seasons editor.</div>
              )}

              <div className="section-title">Needs attention ({warnings.length})</div>
              {warnings.length === 0 ? (
                <div className="notice ok">Everything looks complete for the current season. ✓</div>
              ) : (
                warnings.map((wn, i) => (
                  <button
                    className="notice warn clickable"
                    key={i}
                    style={{ whiteSpace: 'normal' }}
                    onClick={() => onNavigate(wn.section)}
                    title={`Open ${wn.section} to fix this`}
                  >
                    {wn.msg}
                    <span className="notice-go"><Icon name="arrow" size={15} /></span>
                  </button>
                ))
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
