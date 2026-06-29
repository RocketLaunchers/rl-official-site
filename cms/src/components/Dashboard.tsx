import { useEffect, useState } from 'react';
import {
  seasonsApi, rocketsApi, peopleApi, sponsorsApi, subteamsApi, constitutionApi,
  type Season, type Rocket, type Person, type Sponsor, type Subteam, type Constitution,
} from '../api';

type Data = {
  seasons: Season[];
  rockets: Rocket[];
  people: Person[];
  sponsors: Sponsor[];
  subteams: Subteam[];
  constitutions: Constitution[];
};

/** Compute "missing content" warnings for the current season, like the spec asks. */
function computeWarnings(d: Data): string[] {
  const w: string[] = [];
  const current = d.seasons.find((s) => s.status === 'current');
  if (!current) {
    w.push('No season is marked “current”.');
    return w;
  }
  const byId = <T extends { id: string }>(xs: T[], id: string) => xs.find((x) => x.id === id);

  if (!current.currentRocket) w.push(`${current.name} has no current rocket set.`);
  else {
    const rocket = byId(d.rockets, current.currentRocket);
    if (!rocket) w.push(`Current rocket "${current.currentRocket}" has no rocket record.`);
    else if ((rocket.status === 'Launched' || rocket.status === 'Retired') && !rocket.results.trim())
      w.push(`${rocket.name} has no launch result recorded.`);
  }

  if (!current.advisors.some((a) => a.category === 'Faculty Advisor'))
    w.push(`${current.name} has no faculty advisor assigned.`);
  if (current.roster.length === 0) w.push(`${current.name} has an empty roster.`);

  if (!d.constitutions.some((c) => c.status === 'current')) w.push('No constitution is marked “current”.');

  // Sponsor logos missing (current season).
  for (const entry of current.sponsors) {
    const sp = byId(d.sponsors, entry.sponsor);
    if (sp && !sp.logo) w.push(`Sponsor “${sp.name}” has no logo.`);
  }

  // Active subteams missing a description.
  for (const id of current.subteams) {
    const st = byId(d.subteams, id);
    if (st && !st.shortDescription.trim()) w.push(`Subteam “${st.name}” has no description yet.`);
  }

  // Roster members missing photos (consent-aware).
  const missingPhotos = current.roster
    .map((r) => byId(d.people, r.person))
    .filter((p): p is Person => !!p && p.privacy.showPhoto && !p.photo);
  if (missingPhotos.length) w.push(`${missingPhotos.length} team member(s) missing a photo.`);

  return w;
}

export default function Dashboard({ repo }: { repo: string }) {
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
                warnings.map((msg, i) => <div className="notice error" key={i} style={{ whiteSpace: 'normal' }}>{msg}</div>)
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
