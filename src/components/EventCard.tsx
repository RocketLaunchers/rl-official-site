import ProjectGallery from './ProjectGallery';
import Icon from './Icons';
import type { EventItem } from '../data/events';
import { seasonById } from '../data/seasons';
import CustomFields from './CustomFields';

const CATEGORY_LABEL: Record<string, string> = {
  competition: 'Competition',
  launch: 'Launch',
  meeting: 'Meeting',
  outreach: 'Outreach',
  social: 'Social',
  other: 'Event',
};

const CalendarIcon = () => (
  <svg className="w-4 h-4 text-ink-faint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
  </svg>
);

const PinIcon = () => (
  <svg className="w-4 h-4 text-ink-faint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
  </svg>
);

/**
 * One event card, shared by the Competitions and Events pages.
 *
 * `wide` switches to a horizontal layout — a large logo/media panel on the left,
 * content filling the right — for full-width rows (competitions). The default is
 * the vertical card used in the multi-column Events grid.
 */
export default function EventCard({ event, showAwards = true, wide = false }: { event: EventItem; showAwards?: boolean; wide?: boolean }) {
  const season = event.season ? seasonById(event.season) : undefined;
  const when = event.displayDate || event.date;
  const hasMedia = event.media.length > 0;

  // Content shared by both layouts (only the title/visual arrangement differs).
  const categoryRow = (
    <div className="flex flex-wrap items-center gap-3 mb-4 text-[11px] uppercase tracking-[0.15em]">
      <span className="text-accent/80 border border-accent/30 px-2 py-0.5">
        {CATEGORY_LABEL[event.category] ?? event.category}
      </span>
      {season && <span className="text-ink-faint font-light normal-case tracking-wide">{season.name}</span>}
    </div>
  );

  const metaRow = (when || event.location) && (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-ink-muted font-light mb-5">
      {when && (
        <span className="flex items-center gap-1.5">
          <CalendarIcon />
          {when}
        </span>
      )}
      {event.location && (
        <span className="flex items-center gap-1.5">
          <PinIcon />
          {event.location}
        </span>
      )}
    </div>
  );

  const placement = event.placement && (
    <div className="inline-flex self-start items-center gap-2 border border-accent/30 bg-accent/[0.05] text-accent text-sm font-light px-3.5 py-1.5 mb-5">
      <Icon name="trophy" className="w-4 h-4" />
      {event.placement}
    </div>
  );

  const description = event.description && (
    <p className="text-ink-soft text-base font-light leading-relaxed max-w-3xl">
      {event.description}
    </p>
  );

  const awards = showAwards && event.awards.length > 0 && (
    <ul className="mt-5 space-y-2">
      {event.awards.map((a) => (
        <li key={a} className="flex items-start gap-2.5 text-ink-soft text-sm font-light">
          <Icon name="trophy" className="w-4 h-4 text-accent/70 shrink-0 mt-0.5" />
          {a}
        </li>
      ))}
    </ul>
  );

  const custom = <CustomFields fields={event.customFields} className="mt-5 border-t border-line/10 divide-y divide-line/10" />;

  if (wide) {
    return (
      <article className="border border-line/10 bg-surface overflow-hidden md:flex hover:border-line/20 transition-colors">
        {(hasMedia || event.logo) && (
          <div className="md:w-2/5 shrink-0 bg-well border-b md:border-b-0 md:border-r border-line/10 overflow-hidden">
            {hasMedia ? (
              <div className="aspect-[4/3] md:h-full">
                <ProjectGallery items={event.media} title={event.title} />
              </div>
            ) : (
              <div className="h-full min-h-[240px] flex items-center justify-center p-8">
                <img src={event.logo} alt={`${event.title} logo`} className="max-w-full max-h-[260px] object-contain" />
              </div>
            )}
          </div>
        )}
        <div className="p-6 md:p-10 flex flex-col justify-center flex-1 min-w-0">
          {categoryRow}
          <h3 className="font-display text-3xl md:text-4xl font-light text-ink tracking-tight leading-tight mb-4">
            {event.title}
          </h3>
          {metaRow}
          {placement}
          {description}
          {awards}
          {custom}
        </div>
      </article>
    );
  }

  return (
    <article className="border border-line/10 bg-surface overflow-hidden">
      {hasMedia && (
        <div className="aspect-[2/1] bg-well border-b border-line/10 overflow-hidden">
          <ProjectGallery items={event.media} title={event.title} />
        </div>
      )}

      <div className="p-6 md:p-8">
        {categoryRow}

        <div className="flex items-start gap-4 mb-3">
          {event.logo && (
            <img
              src={event.logo}
              alt={`${event.title} logo`}
              className="w-14 h-14 object-contain shrink-0 bg-surface-2 border border-line/10 p-1.5"
            />
          )}
          <h3 className="font-display text-2xl md:text-3xl font-light text-ink tracking-tight leading-tight">
            {event.title}
          </h3>
        </div>

        {metaRow}
        {placement}
        {description}
        {awards}
        {custom}
      </div>
    </article>
  );
}
