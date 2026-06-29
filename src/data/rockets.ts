import { RocketSchema, type Rocket } from '../content/schema';
import { loadCollection } from './_load';

export type { Rocket };

const modules = import.meta.glob('../content/rockets/*.json', { eager: true });

export const rockets: Rocket[] = loadCollection(modules, RocketSchema, 'rocket').sort(
  (a, b) => a.displayOrder - b.displayOrder,
);

export const rocketById = (id: string): Rocket | undefined => rockets.find((r) => r.id === id);

export const rocketsForSeason = (seasonId: string): Rocket[] =>
  rockets.filter((r) => r.seasons.includes(seasonId));
