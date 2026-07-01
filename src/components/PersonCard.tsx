import type { Person } from '../content/schema';

/** Initials fallback when a person has no photo. */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

/**
 * A reusable person tile used by the team roster, advisors/mentors, and alumni.
 * `subtitle` is the role/category line — pass an array to show several (a member
 * who holds multiple roles, or an alum's full history); `meta` is optional
 * secondary text (subteam, graduation year, company). Honors privacy flags.
 */
export default function PersonCard({
  person,
  subtitle,
  meta,
  onClick,
}: {
  person: Person;
  subtitle?: string | string[];
  meta?: string;
  /** When set, the whole card becomes a button (e.g. to open a profile). */
  onClick?: () => void;
}) {
  const subtitles = subtitle == null ? [] : Array.isArray(subtitle) ? subtitle : [subtitle];
  const showPhoto = person.privacy.showPhoto && person.photo;
  const showLinkedin = person.privacy.showLinkedin && person.links.linkedin;
  const showEmail = person.privacy.showEmail && person.links.email;

  return (
    <div
      className={`group border border-line/10 bg-surface hover:border-line/25 hover:bg-surface-2 transition-all duration-300 ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <div className="aspect-square bg-well overflow-hidden border-b border-line/10 flex items-center justify-center">
        {showPhoto ? (
          <img src={person.photo} alt={person.name} className="w-full h-full object-cover" />
        ) : (
          <span className="font-display text-4xl font-light text-ink-faint tracking-wide select-none">
            {initials(person.name)}
          </span>
        )}
      </div>
      <div className="p-5">
        <h3 className="font-display text-base font-light text-ink tracking-tight">{person.name}</h3>
        {subtitles.map((s, i) => (
          <p
            key={i}
            className={`text-[11px] uppercase tracking-[0.15em] text-accent/80 font-light ${i === 0 ? 'mt-1' : 'mt-0.5'}`}
          >
            {s}
          </p>
        ))}
        {meta && <p className="text-ink-faint text-[13px] font-light mt-1.5">{meta}</p>}
        {person.major && <p className="text-ink-faint text-[13px] font-light mt-0.5">{person.major}</p>}
        {(showLinkedin || showEmail) && (
          <div className="flex items-center gap-4 mt-3" onClick={(e) => e.stopPropagation()}>
            {showLinkedin && (
              <a
                href={person.links.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ink-faint hover:text-ink transition-colors"
                aria-label={`${person.name} on LinkedIn`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
            )}
            {showEmail && (
              <a
                href={`mailto:${person.links.email}`}
                className="text-ink-faint hover:text-ink transition-colors"
                aria-label={`Email ${person.name}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
