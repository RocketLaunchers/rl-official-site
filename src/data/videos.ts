import { VideosSchema, type Video } from '../content/schema';

/** Kept as the historical name used by the Videos/VideoGallery components. */
export type VideoData = Video;

/**
 * Loads the video portfolio from a single JSON list and validates it against
 * the shared Zod schema (invalid content fails the build). Consumed by the
 * Videos/VideoGallery components (not currently mounted on any route).
 */

function loadVideos(): VideoData[] {
  const modules = import.meta.glob('../content/videos/index.json', { eager: true });
  for (const mod of Object.values(modules)) {
    const result = VideosSchema.safeParse((mod as { default: unknown }).default);
    if (result.success) return result.data.items;
    const message = `[content] Invalid videos/index.json:\n${result.error.message}`;
    if (import.meta.env.PROD) throw new Error(message);
    console.error(message);
  }
  return [];
}

export const portfolioVideos: VideoData[] = loadVideos();

// Filter functions for easy categorization
export const getVideosByCategory = (category: VideoData['category']) =>
  portfolioVideos.filter((video) => video.category === category);

export const getFeaturedVideos = () =>
  portfolioVideos.slice(0, 3); // Get first 3 as featured
