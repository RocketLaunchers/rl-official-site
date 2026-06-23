import { GallerySchema, type GalleryItem } from '../content/schema';

export type { GalleryItem };

/**
 * Loads the community-involvement gallery from a single JSON list and validates
 * it against the shared Zod schema (invalid content fails the build).
 */

function loadGallery(): GalleryItem[] {
  const modules = import.meta.glob('../content/gallery/index.json', { eager: true });
  for (const mod of Object.values(modules)) {
    const result = GallerySchema.safeParse((mod as { default: unknown }).default);
    if (result.success) return result.data.items;
    const message = `[content] Invalid gallery/index.json:\n${result.error.message}`;
    if (import.meta.env.PROD) throw new Error(message);
    console.error(message);
  }
  return [];
}

export const galleryItems: GalleryItem[] = loadGallery();
