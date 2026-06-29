import { EventSchema, type EventItem } from '../content/schema';
import { loadCollection } from './_load';

export type { EventItem };

const modules = import.meta.glob('../content/events/*.json', { eager: true });

/** Events newest-first by date. */
export const events: EventItem[] = loadCollection(modules, EventSchema, 'event').sort((a, b) =>
  (b.date ?? '').localeCompare(a.date ?? ''),
);

export const eventsForSeason = (seasonId: string): EventItem[] =>
  events.filter((e) => e.season === seasonId);
