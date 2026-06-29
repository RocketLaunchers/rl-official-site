import { SeasonSchema, type Season } from '../content/schema';
import { loadCollection } from './_load';

export type { Season };

const modules = import.meta.glob('../content/seasons/*.json', { eager: true });

/** Seasons newest-first (by start date). */
export const seasons: Season[] = loadCollection(modules, SeasonSchema, 'season').sort((a, b) =>
  (b.startDate ?? '').localeCompare(a.startDate ?? ''),
);

/** The season marked `current` (falls back to the newest). */
export const currentSeason: Season | undefined =
  seasons.find((s) => s.status === 'current') ?? seasons[0];

export const seasonById = (id: string): Season | undefined => seasons.find((s) => s.id === id);
