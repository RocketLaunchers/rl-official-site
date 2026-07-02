import { useEffect } from 'react';
import type { Person } from '../content/schema';
import { roleHistoryFor, eventsAttendedBy } from '../data/org';
import CustomFields from './CustomFields';
import { usableCustomFields } from '../lib/customFields';

/** Initials fallback when a person has no photo. */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

const LinkedInIcon = (
  <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

const EmailIcon = (
  <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const GitHubIcon = (
  <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 2.9-.39c.98 0 1.97.13 2.9.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.69 5.41-5.25 5.69.41.36.78 1.06.78 2.14 0 1.55-.01 2.8-.01 3.18 0 .31.21.68.8.56A10.53 10.53 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5z" />
  </svg>
);

const WebsiteIcon = (
  <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="9" strokeWidth={2} />
    <path strokeLinecap="round" strokeWidth={2} d="M3 12h18M12 3c2.6 2.7 2.6 15.3 0 18M12 3c-2.6 2.7-2.6 15.3 0 18" />
  </svg>
);

/**
 * A rich, full-profile overlay for a person — opened by clicking their card on
 * the team/alumni pages. Unlike the compact team card (photo + this-season role),
 * this shows the big headshot, major, full bio, contact icons, and their whole
 * role history across seasons. Honors the same privacy flags as the card.
 */
export default function PersonProfileModal({
  person,
  titles = [],
  onClose,
}: {
  person: Person;
  /** Headline role line(s) under the name; falls back to the newest season held. */
  titles?: string[];
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = 'auto';
    };
  }, [onClose]);

  const history = roleHistoryFor(person.id);
  const eventsAttended = eventsAttendedBy(person.id);
  const headline = titles.length ? titles : history[0]?.titles ?? [];

  const showPhoto = person.privacy.showPhoto && person.photo;
  const showLinkedin = person.privacy.showLinkedin && person.links.linkedin;
  const showEmail = person.privacy.showEmail && person.links.email;
  const showCompany = person.privacy.showCompany && person.company;
  const meta = [person.major, person.gradYear ? `Class of ${person.gradYear}` : ''].filter(Boolean);

  const links: { key: string; href: string; label: string; icon: JSX.Element }[] = [];
  if (showEmail) links.push({ key: 'email', href: `mailto:${person.links.email}`, label: `Email ${person.name}`, icon: EmailIcon });
  if (showLinkedin) links.push({ key: 'linkedin', href: person.links.linkedin, label: `${person.name} on LinkedIn`, icon: LinkedInIcon });
  if (person.links.github) links.push({ key: 'github', href: person.links.github, label: `${person.name} on GitHub`, icon: GitHubIcon });
  if (person.links.website) {
    const w = person.links.website;
    links.push({ key: 'website', href: /^https?:\/\//.test(w) ? w : `https://${w}`, label: `${person.name}'s website`, icon: WebsiteIcon });
  }

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${person.name} profile`}
    >
      <div
        className="relative bg-surface border border-line/20 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close profile"
          className="absolute top-4 right-4 text-ink-faint hover:text-ink transition-colors z-10"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row gap-6 sm:gap-7">
            {/* Headshot — same generous square as the team catalog cards. */}
            {showPhoto ? (
              <img
                src={person.photo}
                alt={person.name}
                className="w-48 sm:w-60 aspect-square object-cover border border-line/10 bg-well shrink-0 mx-auto sm:mx-0"
              />
            ) : (
              <div className="w-48 sm:w-60 aspect-square bg-well border border-line/10 flex items-center justify-center shrink-0 mx-auto sm:mx-0">
                <span className="font-display text-5xl font-light text-ink-faint select-none">{initials(person.name)}</span>
              </div>
            )}

            <div className="min-w-0 flex-1 pr-6">
              <h2 className="font-display text-2xl sm:text-3xl font-light text-ink tracking-tight">{person.name}</h2>
              {headline.map((t, i) => (
                <p key={i} className={`text-[11px] uppercase tracking-[0.16em] text-accent/80 font-light ${i === 0 ? 'mt-2' : 'mt-0.5'}`}>
                  {t}
                </p>
              ))}
              {meta.length > 0 && <p className="text-ink-soft text-sm font-light mt-3">{meta.join(' · ')}</p>}
              {showCompany && <p className="text-ink-faint text-sm font-light mt-1">Now at {person.company}</p>}

              {links.length > 0 && (
                <div className="flex items-center gap-4 mt-4" onClick={(e) => e.stopPropagation()}>
                  {links.map((l) => (
                    <a
                      key={l.key}
                      href={l.href}
                      target={l.key === 'email' ? undefined : '_blank'}
                      rel="noopener noreferrer"
                      aria-label={l.label}
                      title={l.label}
                      className="text-ink-faint hover:text-ink transition-colors"
                    >
                      {l.icon}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          {person.bio && (
            <div className="mt-7">
              <h3 className="text-ink-faint text-[11px] uppercase tracking-[0.2em] font-light mb-3">About</h3>
              <p className="text-ink-soft font-light text-[15px] leading-relaxed whitespace-pre-line">{person.bio}</p>
            </div>
          )}

          {usableCustomFields(person.customFields).length > 0 && (
            <div className="mt-7">
              <h3 className="text-ink-faint text-[11px] uppercase tracking-[0.2em] font-light mb-3">More</h3>
              <CustomFields fields={person.customFields} className="border-t border-line/10 divide-y divide-line/10" />
            </div>
          )}

          {history.length > 0 && (
            <div className="mt-7">
              <h3 className="text-ink-faint text-[11px] uppercase tracking-[0.2em] font-light mb-3">Role history</h3>
              <ul className="divide-y divide-line/10 border-t border-line/10">
                {history.map((h) => (
                  <li key={h.seasonId} className="flex gap-4 py-2.5">
                    <span className="text-ink-faint text-[13px] font-light w-24 shrink-0 tabular-nums">{h.seasonName}</span>
                    <span className="text-ink text-sm font-light">{h.titles.join(' · ')}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {eventsAttended.length > 0 && (
            <div className="mt-7">
              <h3 className="text-ink-faint text-[11px] uppercase tracking-[0.2em] font-light mb-3">Events attended</h3>
              <ul className="divide-y divide-line/10 border-t border-line/10">
                {eventsAttended.map((e) => (
                  <li key={e.id} className="flex gap-4 py-2.5">
                    <span className="text-ink-faint text-[13px] font-light w-24 shrink-0 tabular-nums">{e.displayDate || e.date || ''}</span>
                    <span className="text-ink text-sm font-light">{e.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
