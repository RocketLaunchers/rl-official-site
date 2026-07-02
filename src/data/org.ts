import type {
  Season,
  Person,
  Role,
  Subteam,
  Sponsor,
  RosterEntry,
  SponsorEntry,
  AdvisorEntry,
  EventItem,
} from '../content/schema';
import { seasons, seasonById } from './seasons';
import { people, personById } from './people';
import { roleById } from './roles';
import { subteamById } from './subteams';
import { sponsorById } from './sponsors';
import { events } from './events';

/**
 * The relational resolver for the season-based content model.
 *
 * Seasons embed their connections (roster / sponsors / advisors) as small
 * entries that reference reusable records by id. These helpers join those
 * entries back to the full Person / Role / Subteam / Sponsor records so the
 * React components stay declarative. Dangling references (an id with no
 * matching record) are skipped gracefully rather than crashing the page.
 */

export type RosterMember = { entry: RosterEntry; person: Person; role: Role; subteam?: Subteam };
export type ResolvedSponsor = { entry: SponsorEntry; sponsor: Sponsor };
export type ResolvedAdvisor = { entry: AdvisorEntry; person: Person };

const bySeason = (id: string): Season | undefined => seasonById(id);

/**
 * Display title for a roster position. Subteam-scoped roles (Lead / Co-Lead /
 * Member) compose with their subteam — "Avionics Lead", "Recovery Member" — while
 * org-wide officer roles (President, …) show by name. Falls back to the bare role
 * name when a subteam role somehow has no subteam attached.
 */
export function roleTitle(role: Role, subteam?: Subteam): string {
  return role.scope === 'subteam' && subteam ? `${subteam.name} ${role.name}` : role.name;
}

/**
 * Resolved roster for a season: only entries flagged to display, with dangling
 * references and non-public people dropped. Ordering is not applied here — it is
 * derived from the global role/subteam order by `groupedRoster`, so the team
 * reads the same way every season (no per-season hand-numbering).
 */
export function rosterForSeason(seasonId: string): RosterMember[] {
  const season = bySeason(seasonId);
  if (!season) return [];
  const out: RosterMember[] = [];
  for (const entry of season.roster) {
    if (!entry.displayOnTeam) continue;
    const person = personById(entry.person);
    const role = roleById(entry.role);
    if (!person || !person.privacy.showPublicly || !role) continue;
    out.push({ entry, person, role, subteam: entry.subteam ? subteamById(entry.subteam) : undefined });
  }
  return out;
}

/**
 * A person as shown on the team page: one card that lists every role they hold
 * this season. Someone can wear two hats (e.g. a Chief of Engineering who also
 * leads Payload), so the same person can appear in more than one section — but
 * each of their cards still lists their full set of titles.
 */
export type RosterPerson = { person: Person; titles: string[] };

/** Which team-page section a role belongs to. */
function roleSection(role: Role): 'officers' | 'leads' | 'members' {
  if (role.isSubteamRole) return 'leads';
  if (role.isLeadership) return 'officers';
  return 'members';
}

const byName = (a: RosterMember, b: RosterMember) => a.person.name.localeCompare(b.person.name);
const subOrder = (m: RosterMember) => m.subteam?.displayOrder ?? 0;

/**
 * Section comparators. Everything is driven by the *global* role and subteam
 * order (set once in the Roles / Subteams editors), never by per-season numbers,
 * so a role always lands in the same spot across the whole season history:
 *  - officers   → by role rank (President, VP, … set in Roles), then name
 *  - leads      → by subteam order (set in Subteams), then role rank (Lead before
 *                 Co-Lead), then name
 *  - members    → by subteam order, then name
 */
const SECTION_SORT: Record<'officers' | 'leads' | 'members', (a: RosterMember, b: RosterMember) => number> = {
  officers: (a, b) => a.role.displayOrder - b.role.displayOrder || byName(a, b),
  leads: (a, b) => subOrder(a) - subOrder(b) || a.role.displayOrder - b.role.displayOrder || byName(a, b),
  members: (a, b) => subOrder(a) - subOrder(b) || byName(a, b),
};

/**
 * Roster split into executive officers, subteam leads, and general members.
 *
 * A person is listed in every section they hold a visible role in, and each of
 * their cards carries their full set of season titles — so someone who is both
 * an officer and a subteam lead appears in both sections, each card reading e.g.
 * "Chief of Engineering · Payload Lead". Roles toggled off (`displayOnTeam:
 * false`) are already dropped by `rosterForSeason`, so they never show. Ordering
 * within each section comes from the global role/subteam order (see SECTION_SORT).
 */
export function groupedRoster(seasonId: string): {
  officers: RosterPerson[];
  leads: RosterPerson[];
  members: RosterPerson[];
} {
  const all = rosterForSeason(seasonId);
  // Each person's roles, so a multi-role card can list them all, ranked by role.
  const rolesByPerson = new Map<string, RosterMember[]>();
  for (const m of all) {
    const arr = rolesByPerson.get(m.person.id) ?? [];
    arr.push(m);
    rolesByPerson.set(m.person.id, arr);
  }
  const titlesFor = (personId: string): string[] => {
    const ranked = [...(rolesByPerson.get(personId) ?? [])].sort((a, b) => a.role.displayOrder - b.role.displayOrder);
    const titles: string[] = [];
    for (const m of ranked) {
      const t = roleTitle(m.role, m.subteam);
      if (!titles.includes(t)) titles.push(t);
    }
    return titles;
  };
  // For a section, keep one representative entry per person (their best-ranked
  // role in that section), then order the people by that section's comparator.
  const build = (section: 'officers' | 'leads' | 'members'): RosterPerson[] => {
    const cmp = SECTION_SORT[section];
    const repByPerson = new Map<string, RosterMember>();
    for (const m of all) {
      if (roleSection(m.role) !== section) continue;
      const cur = repByPerson.get(m.person.id);
      if (!cur || cmp(m, cur) < 0) repByPerson.set(m.person.id, m);
    }
    return [...repByPerson.values()].sort(cmp).map((m) => ({ person: m.person, titles: titlesFor(m.person.id) }));
  };
  return { officers: build('officers'), leads: build('leads'), members: build('members') };
}

/** Resolved, ordered sponsors for a season. */
export function sponsorsForSeason(seasonId: string): ResolvedSponsor[] {
  const season = bySeason(seasonId);
  if (!season) return [];
  const out: ResolvedSponsor[] = [];
  for (const entry of [...season.sponsors].sort((a, b) => a.displayOrder - b.displayOrder)) {
    const sponsor = sponsorById(entry.sponsor);
    if (!sponsor) continue;
    out.push({ entry, sponsor });
  }
  return out;
}

/** Sponsors grouped by the season's tier order (skips empty tiers). */
export function sponsorsByTier(seasonId: string): { tier: string; sponsors: ResolvedSponsor[] }[] {
  const season = bySeason(seasonId);
  if (!season) return [];
  const resolved = sponsorsForSeason(seasonId);
  const tiers = season.sponsorTiers.length ? season.sponsorTiers : ['Sponsors'];
  const groups = tiers.map((tier) => ({ tier, sponsors: resolved.filter((s) => s.entry.tier === tier) }));
  // Any sponsor whose tier isn't in the list falls into a trailing "Other" bucket.
  const known = new Set(tiers);
  const other = resolved.filter((s) => !known.has(s.entry.tier));
  if (other.length) groups.push({ tier: 'Other', sponsors: other });
  return groups.filter((g) => g.sponsors.length > 0);
}

/** Resolved, ordered advisors & mentors for a season. */
export function advisorsForSeason(seasonId: string): ResolvedAdvisor[] {
  const season = bySeason(seasonId);
  if (!season) return [];
  const out: ResolvedAdvisor[] = [];
  for (const entry of [...season.advisors].sort((a, b) => a.displayOrder - b.displayOrder)) {
    const person = personById(entry.person);
    if (!person || !person.privacy.showPublicly) continue;
    out.push({ entry, person });
  }
  return out;
}

/** Active subteam records for a season, in the season's declared order. */
export function subteamsForSeason(seasonId: string): Subteam[] {
  const season = bySeason(seasonId);
  if (!season) return [];
  const out: Subteam[] = [];
  for (const id of season.subteams) {
    const st = subteamById(id);
    if (st) out.push(st);
  }
  return out;
}

/** Alumni who consent to public display, newest grad year first. */
export const alumni: Person[] = people
  .filter((p) => p.isAlumni && p.privacy.showPublicly)
  .sort((a, b) => (b.gradYear ?? 0) - (a.gradYear ?? 0) || a.name.localeCompare(b.name));

/**
 * Every season role a person has held, newest season first (for profiles/alumni).
 * Roles hidden with `displayOnTeam: false` are omitted, so the per-role toggle
 * applies to a person's history too.
 */
export function pastRolesForPerson(personId: string): { season: Season; role: Role; subteam?: Subteam }[] {
  const out: { season: Season; role: Role; subteam?: Subteam }[] = [];
  // `seasons` is newest-first via the seasons loader.
  for (const season of seasons) {
    for (const entry of season.roster) {
      if (entry.person !== personId || !entry.displayOnTeam) continue;
      const role = roleById(entry.role);
      if (!role) continue;
      out.push({ season, role, subteam: entry.subteam ? subteamById(entry.subteam) : undefined });
    }
  }
  return out;
}

/** A person's full role history as "<Title> · <Season>" lines (for alumni cards). */
export function pastRoleTitles(personId: string): string[] {
  return pastRolesForPerson(personId).map(
    ({ role, subteam, season }) => `${roleTitle(role, subteam)} · ${season.name.replace(/\s*Season$/i, '')}`,
  );
}

/**
 * A person's role history grouped by season (newest first) — one row per season
 * with all the titles they held that year. Powers the profile card's history.
 */
export function roleHistoryFor(personId: string): { seasonId: string; seasonName: string; titles: string[] }[] {
  const out: { seasonId: string; seasonName: string; titles: string[] }[] = [];
  const indexBySeason = new Map<string, number>();
  for (const { season, role, subteam } of pastRolesForPerson(personId)) {
    const title = roleTitle(role, subteam);
    let i = indexBySeason.get(season.id);
    if (i === undefined) {
      i = out.length;
      indexBySeason.set(season.id, i);
      out.push({ seasonId: season.id, seasonName: season.name.replace(/\s*Season$/i, ''), titles: [] });
    }
    if (!out[i].titles.includes(title)) out[i].titles.push(title);
  }
  return out;
}

/**
 * Every catalog event a person is marked as having attended, newest first.
 * Attendance is recorded on the event (`attendees`), so this is the person-facing
 * view of that link — the profile card's event history, mirroring role history.
 * `events` is already sorted newest-first by the events loader.
 */
export function eventsAttendedBy(personId: string): EventItem[] {
  return events.filter((e) => e.attendees.includes(personId));
}
