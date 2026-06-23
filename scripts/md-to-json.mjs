// One-shot migration: src/blogs/<slug>/index.md  ->  src/content/blog/<slug>/index.json
//
// Converts the legacy markdown blog posts into the validated JSON block format.
// Unlike the old src/utils/parseBlogPost.ts (which flattened headings to <h2>,
// lists to "• " text, and code/quotes to plain text), this preserves structure:
// heading levels, ordered/unordered lists, code language, and blockquotes.
//
// Run once:  node scripts/md-to-json.mjs
// After verifying the site renders, src/blogs and the markdown parser can go.

import { marked } from 'marked';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcBlogs = path.join(root, 'src', 'blogs');
const destRoot = path.join(root, 'src', 'content', 'blog');

/* ---------------------------------------------------------------- helpers */

function parseFrontmatter(md) {
  const lines = md.split(/\r?\n/);
  if (lines[0]?.trim() !== '---') return { data: {}, body: md };
  let i = 1;
  const fm = [];
  while (i < lines.length && lines[i].trim() !== '---') fm.push(lines[i++]);
  const body = lines.slice(i + 1).join('\n');
  const data = {};
  for (const raw of fm) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const arr = line.match(/^(\w+)\s*:\s*\[(.*)\]\s*$/);
    if (arr) {
      data[arr[1]] = arr[2]
        .split(',')
        .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean);
      continue;
    }
    const kv = line.match(/^(\w+)\s*:\s*(.*)$/);
    if (kv) data[kv[1]] = kv[2].trim().replace(/^['"]|['"]$/g, '');
  }
  return { data, body };
}

function toIsoDate(str) {
  if (!str) return undefined;
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return undefined;
  // Use UTC parts to avoid TZ drift on "Month DD, YYYY" strings.
  return d.toISOString().slice(0, 10);
}

function toBool(v, def) {
  if (v == null) return def;
  const s = String(v).trim().toLowerCase();
  if (s === 'true') return true;
  if (s === 'false') return false;
  return def;
}

function normalizeMediaSrc(src) {
  const s = src.trim().replace(/^\.\//, '');
  return s; // keep relative (assets/.., videos/..) or external as-is
}

const VIDEO_RE = /^\[video:\s*([^|\]]+?)\s*(?:\|\s*([^|\]]*?)\s*)?(?:\|\s*(.*))?\]$/i;
const IMAGE_RE = /^!\[([^\]]*)\]\(([^)]+)\)$/;

function videoBlockFromText(text) {
  const m = text.trim().match(VIDEO_RE);
  if (!m) return null;
  const flags = {};
  for (const attr of (m[3] || '').split('|').map((s) => s.trim()).filter(Boolean)) {
    const [k, v] = attr.split('=').map((s) => s?.trim());
    if (k) flags[k] = v ?? '';
  }
  const block = { type: 'video', src: normalizeMediaSrc(m[1].trim()) };
  const caption = (m[2] || '').trim();
  if (caption) block.caption = caption;
  block.controls = toBool(flags.controls, true);
  block.muted = toBool(flags.muted, false);
  block.autoplay = toBool(flags.autoplay, false);
  block.loop = toBool(flags.loop, false);
  return block;
}

function imageBlockFromText(text) {
  const m = text.trim().match(IMAGE_RE);
  if (!m) return null;
  const block = { type: 'image', src: normalizeMediaSrc(m[2].trim()) };
  const alt = (m[1] || '').trim();
  if (alt) block.alt = alt;
  return block;
}

function blocksFromMarkdown(body) {
  let tokens = [];
  try {
    tokens = marked.lexer(body);
  } catch {
    tokens = [];
  }
  const blocks = [];
  for (const t of tokens) {
    switch (t.type) {
      case 'heading':
        if (t.text?.trim()) {
          blocks.push({ type: 'heading', level: Math.min(Math.max(t.depth, 1), 3), text: t.text.trim() });
        }
        break;
      case 'paragraph': {
        const text = (t.text || '').trim();
        if (!text) break;
        const video = videoBlockFromText(text);
        if (video) { blocks.push(video); break; }
        const image = imageBlockFromText(text);
        if (image) { blocks.push(image); break; }
        blocks.push({ type: 'paragraph', text });
        break;
      }
      case 'image': {
        const src = normalizeMediaSrc((t.href || '').trim());
        if (src) {
          const block = { type: 'image', src };
          const alt = (t.text || '').trim();
          if (alt) block.alt = alt;
          blocks.push(block);
        }
        break;
      }
      case 'list': {
        const items = t.items.map((it) => (it.text || '').trim()).filter(Boolean);
        if (items.length) blocks.push({ type: 'list', ordered: !!t.ordered, items });
        break;
      }
      case 'code':
        if (t.text) {
          const block = { type: 'code', code: t.text };
          if (t.lang) block.language = t.lang;
          blocks.push(block);
        }
        break;
      case 'blockquote': {
        const text = (t.text || '').trim();
        if (text) blocks.push({ type: 'quote', text });
        break;
      }
      case 'hr':
        blocks.push({ type: 'divider' });
        break;
      default:
        break;
    }
  }
  // assign stable ids
  return blocks.map((b, i) => ({ id: `blk_${String(i + 1).padStart(3, '0')}`, ...b }));
}

/* ------------------------------------------------------------------- main */

if (!fs.existsSync(srcBlogs)) {
  console.error(`No source folder at ${srcBlogs}`);
  process.exit(1);
}

const slugs = fs
  .readdirSync(srcBlogs, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name);

let count = 0;
for (const slug of slugs) {
  const mdPath = path.join(srcBlogs, slug, 'index.md');
  if (!fs.existsSync(mdPath)) continue;

  const { data, body } = parseFrontmatter(fs.readFileSync(mdPath, 'utf8'));
  const displayDate = typeof data.date === 'string' ? data.date : undefined;

  const post = {
    type: 'blog',
    id: typeof data.id === 'string' && data.id.trim() ? data.id.trim() : slug,
    title: typeof data.title === 'string' ? data.title.trim() : slug,
    status: 'published',
    date: toIsoDate(displayDate),
    displayDate,
    excerpt: typeof data.excerpt === 'string' ? data.excerpt : '',
    readTime: typeof data.readTime === 'string' ? data.readTime : '',
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    blocks: blocksFromMarkdown(body),
  };

  // Default cover image: first image block, if any.
  const firstImage = post.blocks.find((b) => b.type === 'image');
  if (firstImage) post.coverImage = firstImage.src;

  const destDir = path.join(destRoot, slug);
  fs.mkdirSync(destDir, { recursive: true });
  fs.writeFileSync(path.join(destDir, 'index.json'), JSON.stringify(post, null, 2) + '\n');

  // Copy colocated media alongside the JSON.
  for (const kind of ['assets', 'videos']) {
    const from = path.join(srcBlogs, slug, kind);
    if (fs.existsSync(from)) fs.cpSync(from, path.join(destDir, kind), { recursive: true });
  }

  count++;
  console.log(`✓ ${slug} -> ${post.blocks.length} blocks${post.date ? '' : '  (⚠ unparseable date)'}`);
}

console.log(`\nMigrated ${count} post(s) to ${path.relative(root, destRoot)}`);
