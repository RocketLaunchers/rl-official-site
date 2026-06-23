import { AboutSchema, type About } from '../content/schema';

export type { About };

/**
 * Loads the About-section content from a single JSON file and validates it
 * against the shared Zod schema (invalid content fails the build).
 */

function loadAbout(): About {
  const modules = import.meta.glob('../content/about/index.json', { eager: true });
  for (const mod of Object.values(modules)) {
    const result = AboutSchema.safeParse((mod as { default: unknown }).default);
    if (result.success) return result.data;
    const message = `[content] Invalid about/index.json:\n${result.error.message}`;
    if (import.meta.env.PROD) throw new Error(message);
    console.error(message);
  }
  return AboutSchema.parse({});
}

export const about: About = loadAbout();
