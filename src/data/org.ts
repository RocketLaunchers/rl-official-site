import type {
  Season,
  Person,
  Role,
  Subteam,
  Sponsor,
  RosterEntry,
  SponsorEntry,
  AdvisorEntry,
} from '../content/schema';
import { seasons, seasonById } from './seasons';
import { people, personById } from './people';
import { roleById } from './roles';
import { subteamById } from './subteams';
import { sponsorById } from './sponsors';

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

/** Resolved roster for a season (only entries flagged to display), ordered. */
export function rosterForSeason(seasonId: string): RosterMember[] {
  const season = bySeason(seasonId);
  if (!season) return [];
  const out: RosterMember[] = [];
  for (const entry of [...season.roster].sort((a, b) => a.displayOrder - b.displayOrder)) {
    if (!entry.displayOnTeam) continue;
    const person = personById(entry.person);
    const role = roleById(entry.role);
    if (!person || !person.privacy.showPublicly || !role) continue;
    out.push({ entry, person, role, subteam: entry.subteam ? subteamById(entry.subteam) : undefined });
  }
  return out;
}

/** Roster split into executive officers, subteam leads, and general members. */
export function groupedRoster(seasonId: string): {
  officers: RosterMember[];
  leads: RosterMember[];
  members: RosterMember[];
} {
  const all = rosterForSeason(seasonId);
  return {
    officers: all.filter((m) => m.role.isLeadership && !m.role.isSubteamRole),
    leads: all.filter((m) => m.role.isSubteamRole),
    members: all.filter((m) => !m.role.isLeadership && !m.role.isSubteamRole),
  };
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

/** Every season role a person has held, newest season first (for profiles/alumni). */
export function pastRolesForPerson(personId: string): { season: Season; role: Role; subteam?: Subteam }[] {
  const out: { season: Season; role: Role; subteam?: Subteam }[] = [];
  // `seasons` is newest-first via the seasons loader.
  for (const season of seasons) {
    for (const entry of season.roster) {
      if (entry.person !== personId) continue;
      const role = roleById(entry.role);
      if (!role) continue;
      out.push({ season, role, subteam: entry.subteam ? subteamById(entry.subteam) : undefined });
    }
  }
  return out;
}
