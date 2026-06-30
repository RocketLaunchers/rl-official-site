import { Link } from 'react-router-dom';
import type { EventItem } from '../data/events';
import { announcements } from '../data/events';

/** Resolve the best image for an announcement: explicit flyer, else first media. */
function flyerSrc(e: EventItem): string {
  if (e.flyer) return e.flyer;
  const img = e.media.find((m) => m.type === 'image');
  return img?.src ?? '';
}

/** Render the CTA as the right element for its destination (URL / route / hash). */
function Cta({ label, href, large }: { label: string; href: string; large?: boolean }) {
  const cls = large
    ? 'inline-flex items-center gap-2 bg-cyan-400 text-black px-6 py-3 text-[13px] tracking-[0.12em] font-medium hover:bg-cyan-300 hover:shadow-[0_0_22px_rgba(34,211,238,0.4)] transition-all duration-300'
    : 'inline-flex items-center gap-2 border border-cyan-400/40 text-cyan-200 px-4 py-2 text-xs tracking-[0.12em] font-light hover:bg-cyan-400/10 transition-all duration-300';
  const arrow = <span aria-hidden>→</span>;
  if (/^https?:\/\//i.test(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {label} {arrow}
      </a>
    );
  }
  if (href.startsWith('/')) {
    return (
      <Link to={href} className={cls}>
        {label} {arrow}
      </Link>
    );
  }
  return (
    <a href={href} className={cls}>
      {label} {arrow}
    </a>
  );
}

function Meta({ when, location }: { when?: string; location?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-neutral-300 font-light">
      {when && (
        <span className="flex items-center gap-1.5">
          <svg className="w-4 h-4 text-cyan-300/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
          </svg>
          {when}
        </span>
      )}
      {location && (
        <span className="flex items-center gap-1.5">
          <svg className="w-4 h-4 text-cyan-300/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
          </svg>
          {location}
        </span>
      )}
    </div>
  );
}

function Flyer({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <div className={`bg-black/40 flex items-center justify-center overflow-hidden ${className ?? ''}`}>
      {src ? (
        <img src={src} alt={alt} className="max-w-full max-h-full object-contain" />
      ) : (
        <span className="text-cyan-300/30 text-[11px] uppercase tracking-[0.2em]">Flyer</span>
      )}
    </div>
  );
}

function PrimaryAnnouncement({ event }: { event: EventItem }) {
  const when = event.displayDate || event.date;
  return (
    <div className="relative border border-cyan-400/30 bg-gradient-to-br from-cyan-400/[0.08] via-white/[0.02] to-transparent shadow-[0_0_60px_-18px_rgba(34,211,238,0.5)] overflow-hidden md:flex">
      <Flyer src={flyerSrc(event)} alt={event.title} className="md:w-2/5 min-h-[260px] border-b md:border-b-0 md:border-r border-cyan-400/20 p-4" />
      <div className="p-7 md:p-10 md:w-3/5 flex flex-col gap-5">
        <h3 className="font-display text-3xl md:text-4xl font-light text-white tracking-tight leading-tight">
          {event.title}
        </h3>
        <Meta when={when} location={event.location} />
        {event.description && (
          <p className="text-neutral-300 text-base font-light leading-relaxed">{event.description}</p>
        )}
        {event.ctaLabel && event.ctaHref && (
          <div className="mt-1">
            <Cta label={event.ctaLabel} href={event.ctaHref} large />
          </div>
        )}
      </div>
    </div>
  );
}

function CompactAnnouncement({ event }: { event: EventItem }) {
  const when = event.displayDate || event.date;
  return (
    <div className="border border-cyan-400/20 bg-cyan-400/[0.03] overflow-hidden flex flex-col sm:flex-row">
      <Flyer src={flyerSrc(event)} alt={event.title} className="sm:w-2/5 aspect-[4/3] sm:aspect-auto border-b sm:border-b-0 sm:border-r border-cyan-400/15" />
      <div className="p-5 sm:w-3/5 flex flex-col gap-3">
        <h3 className="font-display text-xl font-light text-white tracking-tight leading-tight">{event.title}</h3>
        <Meta when={when} location={event.location} />
        {event.description && (
          <p className="text-neutral-400 text-sm font-light leading-relaxed line-clamp-3">{event.description}</p>
        )}
        {event.ctaLabel && event.ctaHref && <Cta label={event.ctaLabel} href={event.ctaHref} />}
      </div>
    </div>
  );
}

/** Standout homepage section promoting featured events the club wants people at. */
const Announcements = () => {
  if (announcements.length === 0) return null;
  const [primary, ...rest] = announcements;

  return (
    <section id="announcements" className="py-20">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center gap-3 mb-8">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400/70" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400" />
          </span>
          <h2 className="text-cyan-300 text-xs uppercase tracking-[0.28em] font-light">Announcements</h2>
        </div>

        <PrimaryAnnouncement event={primary} />

        {rest.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {rest.map((e) => (
              <CompactAnnouncement key={e.id} event={e} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default Announcements;
