import { marked, Tokens } from 'marked';
import type { BlogPost } from '../data/blogPosts';

type Section = BlogPost['content']['sections'][number];

function toBoolean(value: string | undefined, def = false): boolean {
  if (value == null) return def;
  const v = value.trim().toLowerCase();
  if (v === 'true') return true;
  if (v === 'false') return false;
  return def;
}

function isExternalOrAbsolute(src: string): boolean {
  const s = src.trim();
  if (!s) return false;
  if (s.startsWith('/')) return true;
  // Matches http:, https:, data:, blob:, etc., and protocol-relative //
  if (/^(?:[a-z]+:)?\/\//i.test(s)) return true;
  return false;
}

function rewriteMediaUrl(src: string, postId: string): string {
  let s = src.trim();
  if (!s) return s;
  if (isExternalOrAbsolute(s)) return s;
  s = s.replace(/^\.\//, '');
  if (s.startsWith('assets/') || s.startsWith('videos/')) {
    return `/blogs/${postId}/${s}`;
  }
  return s;
}

function parseVideoFromText(text: string, postId: string): Omit<Section, 'type'> & { type: 'video' } | null {
  const m = text.trim().match(/^\[video:\s*([^|\]]+?)\s*(?:\|\s*([^|\]]*?)\s*)?(?:\|\s*(.*))?\]$/i);
  if (!m) return null;
  const src = rewriteMediaUrl(m[1].trim(), postId);
  const caption = (m[2] || '').trim();
  const attrs = (m[3] || '').split('|').map(s => s.trim()).filter(Boolean);
  const flags: Record<string, string> = {};
  for (const attr of attrs) {
    const [k, v] = attr.split('=').map(s => s?.trim());
    if (k) flags[k] = v ?? '';
  }
  return {
    type: 'video',
    content: src,
    caption: caption || undefined,
    controls: toBoolean(flags['controls'], true),
    muted: toBoolean(flags['muted'], false),
    autoplay: toBoolean(flags['autoplay'], false),
    loop: toBoolean(flags['loop'], false),
  };
}

function parseImageFromText(text: string, postId: string): Omit<Section, 'type'> & { type: 'image' } | null {
  const m = text.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
  if (!m) return null;
  const alt = m[1]?.trim() || undefined;
  const src = rewriteMediaUrl(m[2].trim(), postId);
  return { type: 'image', content: src, alt };
}

function parseFrontmatterSimple(md: string): { data: Record<string, any>, content: string } {
  const lines = md.split(/\r?\n/);
  if (lines[0]?.trim() !== '---') return { data: {}, content: md };
  let i = 1;
  const fmLines: string[] = [];
  while (i < lines.length && lines[i].trim() !== '---') {
    fmLines.push(lines[i]);
    i++;
  }
  const rest = lines.slice(i + 1).join('\n');
  const data: Record<string, any> = {};
  for (const raw of fmLines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const arrMatch = line.match(/^(\w+)\s*:\s*\[(.*)\]\s*$/);
    if (arrMatch) {
      const key = arrMatch[1];
      const arrRaw = arrMatch[2];
      const items = arrRaw.split(',').map(s => s.trim()).filter(Boolean).map(s => s.replace(/^['"]|['"]$/g, ''));
      data[key] = items;
      continue;
    }
    const kv = line.match(/^(\w+)\s*:\s*(.*)$/);
    if (kv) {
      const key = kv[1];
      let val = kv[2].trim();
      val = val.replace(/^['"]|['"]$/g, '');
      data[key] = val;
    }
  }
  return { data, content: rest };
}

export function parseBlogPost(mdContent: string, postId: string): BlogPost {
  const { data, content } = parseFrontmatterSimple(mdContent);
  const id = (typeof data.id === 'string' && data.id.trim()) ? data.id.trim() : postId;
  const title = (typeof data.title === 'string' && data.title.trim()) ? data.title.trim() : id;
  const date = (typeof data.date === 'string') ? data.date : '';
  const excerpt = (typeof data.excerpt === 'string') ? data.excerpt : '';
  const readTime = (typeof data.readTime === 'string') ? data.readTime : '';
  const tags = Array.isArray(data.tags) ? (data.tags as any[]).map(String) : [];

  if (import.meta.env.DEV && data.id && data.id !== postId) {
    console.warn(`[parseBlogPost] frontmatter id (${data.id}) does not match folder slug (${postId})`);
  }

  let tokens: any = [] as any;
  try {
    tokens = marked.lexer(content);
  } catch (e) {
    tokens = [] as any;
  }
  const sections: Section[] = [];

  for (const token of tokens) {
    switch (token.type) {
      case 'heading': {
        const t = token as Tokens.Heading;
        if (t.text && t.text.trim()) {
          // Render inline markdown (bold/italic/links) to HTML for headings
          try {
            const html = (marked.parseInline(t.text) as unknown) as string;
            sections.push({ type: 'heading', content: html });
          } catch (e) {
            sections.push({ type: 'heading', content: t.text.trim() });
          }
        }
        break;
      }
      case 'paragraph': {
        const t = token as Tokens.Paragraph;
        const text = t.text?.trim() || '';
        if (!text) break;

        const video = parseVideoFromText(text, id);
        if (video) { sections.push(video); break; }

        const image = parseImageFromText(text, id);
        if (image) { sections.push(image); break; }

        // Render inline markdown (bold/italic/links) to HTML for paragraphs
        try {
          const html = (marked.parseInline(text) as unknown) as string;
          sections.push({ type: 'text', content: html });
        } catch (e) {
          sections.push({ type: 'text', content: text });
        }
        break;
      }
      case 'image': {
        const t = token as Tokens.Image;
        const alt = t.text?.trim() || undefined;
        const href = rewriteMediaUrl((t.href || '').trim(), id);
        if (href) sections.push({ type: 'image', content: href, alt });
        break;
      }
      case 'list': {
        const t = token as Tokens.List;
        for (const item of t.items) {
          const text = (item.text || '').trim();
          if (text) {
            try {
              const html = (marked.parseInline(text) as unknown) as string;
              sections.push({ type: 'text', content: `• ${html}` });
            } catch (e) {
              sections.push({ type: 'text', content: `• ${text}` });
            }
          }
        }
        break;
      }
      case 'code': {
        const t = token as Tokens.Code;
        if (t.text) sections.push({ type: 'text', content: t.text });
        break;
      }
      case 'blockquote': {
        const t = token as Tokens.Blockquote;
        const text = (t.text || '').trim();
        if (text) sections.push({ type: 'text', content: text });
        break;
      }
      default:
        break;
    }
  }

  let post: BlogPost = {
    id,
    title,
    date,
    excerpt,
    readTime,
    content: { sections },
    tags,
  };
  if (sections.length === 0 && content.trim()) {
    post = {
      ...post,
      content: { sections: [{ type: 'text', content: content.trim() }] as Section[] },
    };
  }
  return post;
}
