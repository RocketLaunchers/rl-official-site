import { SubteamSchema, type Subteam } from '../content/schema';
import { loadCollection } from './_load';

export type { Subteam };

const modules = import.meta.glob('../content/subteams/*.json', { eager: true });

export const subteams: Subteam[] = loadCollection(modules, SubteamSchema, 'subteam').sort(
  (a, b) => a.displayOrder - b.displayOrder,
);

export const subteamById = (id: string): Subteam | undefined => subteams.find((s) => s.id === id);
