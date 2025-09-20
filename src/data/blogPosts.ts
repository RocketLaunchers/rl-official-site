export interface BlogPost {
  id: string;
  title: string;
  date: string;
  excerpt: string;
  readTime: string;
  content: {
    sections: Array<{
      type: 'text' | 'heading' | 'image' | 'video';
      content: string;
      alt?: string;
      caption?: string;
      autoplay?: boolean;
      loop?: boolean;
      muted?: boolean;
      controls?: boolean;
    }>;
  };
  tags: string[];
}

import { parseBlogPost } from '../utils/parseBlogPost';

// Try both absolute-from-root and relative patterns, then merge
const mdFilesAbs = import.meta.glob('/src/blogs/*/index.md', { eager: true, query: '?raw', import: 'default' });
const mdFiles = mdFilesAbs as Record<string, unknown>;

const loadedPosts: BlogPost[] = [];
for (const [path, raw] of Object.entries(mdFiles)) {
  try {
    const m = path.replace(/\\/g, '/').match(/blogs\/([^/]+)\/index\.md$/);
    const postId = m?.[1] || 'unknown';
    const post = parseBlogPost(raw as string, postId);
    loadedPosts.push(post);
  } catch (err) {
    console.warn('[blogPosts] Failed to parse', path, err);
  }
}

// Sort by date string descending if possible; falls back to original order
loadedPosts.sort((a, b) => {
  const da = Date.parse(a.date || '');
  const db = Date.parse(b.date || '');
  if (Number.isFinite(da) && Number.isFinite(db)) return db - da;
  return 0;
});

export const blogPosts: BlogPost[] = loadedPosts;