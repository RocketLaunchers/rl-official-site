import { NewsPostSchema, type NewsPost } from '../content/schema';

export type { NewsPost };

/**
 * Loads news/updates posts from JSON at build time, validates each against the
 * shared Zod schema, and resolves colocated media paths to public URLs.
 *
 * A malformed or schema-violating post throws and fails `vite build`, so broken
 * content can never ship. Drafts are visible during `vite dev` (for CMS
 * preview) and excluded from production.
 */

const modules = import.meta.glob('../content/news/*/index.json', { eager: true });

function isExternal(src: string): boolean {
  const s = src.trim();
  return s.startsWith('/') || /^(?:[a-z]+:)?\/\//i.test(s) || s.startsWith('data:');
}

/** Rewrite a post-relative media path (assets/.., videos/..) to its public URL. */
function resolveMedia(src: string | null | undefined, slug: string): string {
  if (!src) return src ?? '';
  const s = src.trim();
  if (isExternal(s)) return s;
  return `/content/news/${slug}/${s.replace(/^\.\//, '')}`;
}

function slugFromPath(path: string): string {
  return path.replace(/\\/g, '/').match(/news\/([^/]+)\/index\.json$/)?.[1] ?? 'unknown';
}

const loaded: NewsPost[] = [];

for (const [path, mod] of Object.entries(modules)) {
  const slug = slugFromPath(path);
  const raw = (mod as { default: unknown }).default;

  const result = NewsPostSchema.safeParse(raw);
  if (!result.success) {
    const message = `[content] Invalid news post "${slug}":\n${result.error.message}`;
    if (import.meta.env.PROD) throw new Error(message);
    console.error(message);
    continue;
  }

  const post = result.data;
  loaded.push({
    ...post,
    coverImage: post.coverImage ? resolveMedia(post.coverImage, slug) : post.coverImage,
    blocks: post.blocks.map((block) =>
      'src' in block ? { ...block, src: resolveMedia(block.src, slug) } : block,
    ),
  });
}

// Published-only in production; keep drafts visible during local development.
const visible = import.meta.env.PROD ? loaded.filter((p) => p.status === 'published') : loaded;

// Newest first by ISO date (lexical sort is correct for YYYY-MM-DD).
visible.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));

export const news: NewsPost[] = visible;

export const newsById = (id: string): NewsPost | undefined => news.find((p) => p.id === id);

export const newsForSeason = (seasonId: string): NewsPost[] =>
  news.filter((p) => p.season === seasonId);
