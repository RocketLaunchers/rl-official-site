import { SiteSchema, type Site } from '../content/schema';

export type { Site };

/**
 * Loads global site settings (hero/title-page text, external links, footer)
 * from a single JSON file, validated against the shared Zod schema.
 */

function loadSite(): Site {
  const modules = import.meta.glob('../content/site/index.json', { eager: true });
  for (const mod of Object.values(modules)) {
    const result = SiteSchema.safeParse((mod as { default: unknown }).default);
    if (result.success) return result.data;
    const message = `[content] Invalid site/index.json:\n${result.error.message}`;
    if (import.meta.env.PROD) throw new Error(message);
    console.error(message);
  }
  return SiteSchema.parse({});
}

export const site: Site = loadSite();
