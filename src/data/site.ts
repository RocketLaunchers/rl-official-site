import { SiteSchema, type Site } from '../content/schema';
import { loadSingleton } from './_load';

export type { Site };

/**
 * Loads global site settings (org name/tagline, hero text, external links,
 * footer) from a single JSON file, validated against the shared Zod schema.
 */
const modules = import.meta.glob('../content/site/index.json', { eager: true });

export const site: Site = loadSingleton(modules, SiteSchema, 'site/index.json', SiteSchema.parse({}));
