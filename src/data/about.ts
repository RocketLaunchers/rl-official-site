import { AboutSchema, type About } from '../content/schema';
import { loadSingleton } from './_load';

export type { About };

/**
 * Loads the "about the club" singleton (mission paragraphs, highlights, stats,
 * join CTA) from a single JSON file, validated against the shared Zod schema.
 */
const modules = import.meta.glob('../content/about/index.json', { eager: true });

export const about: About = loadSingleton(
  modules,
  AboutSchema,
  'about/index.json',
  AboutSchema.parse({}),
);
