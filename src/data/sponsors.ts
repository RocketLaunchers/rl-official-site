import { SponsorSchema, type Sponsor } from '../content/schema';
import { loadCollection } from './_load';

export type { Sponsor };

const modules = import.meta.glob('../content/sponsors/*.json', { eager: true });

export const sponsors: Sponsor[] = loadCollection(modules, SponsorSchema, 'sponsor').sort((a, b) =>
  a.name.localeCompare(b.name),
);

export const sponsorById = (id: string): Sponsor | undefined => sponsors.find((s) => s.id === id);
