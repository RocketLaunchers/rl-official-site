import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import type { ZodType } from 'zod';
import {
  NewsPostSchema,
  PersonSchema,
  RoleSchema,
  SubteamSchema,
  SponsorSchema,
  RocketSchema,
  EventSchema,
  ConstitutionSchema,
  SeasonSchema,
  AlbumSchema,
  AboutSchema,
  SiteSchema,
  type NewsPost,
  type Person,
  type Role,
  type Subteam,
  type Sponsor,
  type Rocket,
  type EventItem,
  type Constitution,
  type Season,
  type Album,
  type About,
  type Site,
} from '@portfolio/content-schema';

/**
 * API layer over the Tauri backend (generic fs + copy commands, dialog plugin,
 * asset protocol) and the shared content schema. Every content type is read,
 * validated, and written here so the React screens stay declarative. Content is
 * validated with the same Zod schema the website uses.
 *
 * The org content model is mostly "one JSON file per record in a folder", so a
 * single generic `makeCollection` factory powers people / roles / subteams /
 * sponsors / rockets / events / constitution / seasons / gallery. News posts
 * (folder + index.json + colocated media) and the site/about singletons keep
 * dedicated helpers.
 */

export const NEWS_REL = 'src/content/news';
export const ABOUT_REL = 'src/content/about/index.json';
export const SITE_REL = 'src/content/site/index.json';

export type DirEntry = { name: string; is_dir: boolean };

const pathExists = (path: string) => invoke<boolean>('path_exists', { path });
const listDir = (path: string) => invoke<DirEntry[]>('list_dir', { path });
const readTextFile = (path: string) => invoke<string>('read_text_file', { path });
const writeTextFile = (path: string, contents: string) => invoke<void>('write_text_file', { path, contents });
const copyFile = (src: string, dest: string) => invoke<void>('copy_file', { src, dest });
const removeFile = (path: string) => invoke<void>('remove_file', { path });
const removeDir = (path: string) => invoke<void>('remove_dir', { path });

const join = (...parts: string[]) => parts.join('/');
const basename = (p: string) => p.split(/[\\/]/).pop() || p;
const isExternal = (s: string) => /^(?:[a-z]+:)?\/\//i.test(s) || s.startsWith('data:');

/* --------------------------------------------------------------- repo / picker */

export async function pickRepo(): Promise<string | null> {
  const result = await open({ directory: true, multiple: false, title: 'Select the Rocket Launchers site repo' });
  return typeof result === 'string' ? result : null;
}

export type RepoValidation = {
  ok: boolean;
  checks: { label: string; exists: boolean; required: boolean }[];
};

export async function validateRepo(root: string): Promise<RepoValidation> {
  const wanted = [
    { label: 'package.json', rel: 'package.json', required: true },
    { label: 'content root', rel: 'src/content', required: true },
    { label: 'seasons', rel: 'src/content/seasons', required: true },
    { label: 'shared schema', rel: 'src/content/schema.ts', required: false },
  ];
  const checks = await Promise.all(
    wanted.map(async (w) => ({ label: w.label, exists: await pathExists(join(root, w.rel)), required: w.required })),
  );
  return { ok: checks.every((c) => c.exists || !c.required), checks };
}

/* ------------------------------------------------------------------ media */

/** Resolve a content image/video `src` to a URL the webview can load. */
export function mediaUrl(root: string, src: string | null | undefined, baseDir?: string): string {
  if (!src) return '';
  const s = src.trim();
  if (!s) return '';
  if (isExternal(s)) return s;
  const abs = s.startsWith('/')
    ? `${root}/public${s}`
    : `${root}/${baseDir ? baseDir + '/' : ''}${s.replace(/^\.\//, '')}`;
  return convertFileSrc(abs);
}

const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif'];
const VIDEO_EXTS = ['mp4', 'webm', 'ogv', 'mov', 'm4v'];
const MODEL_EXTS = ['glb', 'gltf', 'step', 'stp', 'obj'];
const extOf = (p: string) => (p.split('.').pop() || '').toLowerCase();
const isVideoExt = (p: string) => VIDEO_EXTS.includes(extOf(p));

async function pickFile(name: string, extensions: string[]): Promise<string | null> {
  const r = await open({ multiple: false, filters: [{ name, extensions }] });
  return typeof r === 'string' ? r : null;
}

/** Slugified base filename without extension: "My Photo.JPG" → "my-photo". */
function cleanBase(p: string): string {
  return (basename(p).replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')) || 'file';
}

export type Tools = { ffmpeg: boolean; node: boolean };
export const checkTools = () => invoke<Tools>('check_tools');
const processImageCmd = (src: string, dest: string) => invoke<void>('process_image', { src, dest });
const processVideoCmd = (src: string, dest: string) => invoke<void>('process_video', { src, dest });
const convertModelCmd = (repo: string, src: string, dest: string) => invoke<void>('convert_model', { repo, src, dest });

let toolsCache: Tools | null = null;
const tools = async (): Promise<Tools> => (toolsCache ??= await checkTools());

// Compress a picked image → WebP in public/ (copy fallback if ffmpeg is absent).
async function processImageFile(root: string, src: string): Promise<string> {
  const base = cleanBase(src);
  if ((await tools()).ffmpeg && extOf(src) !== 'svg') {
    const name = base + '.webp';
    await processImageCmd(src, join(root, 'public', name));
    return '/' + name;
  }
  const name = base + '.' + extOf(src);
  await copyFile(src, join(root, 'public', name));
  return '/' + name;
}

// Compress a picked video → MP4 in public/ (copy fallback if ffmpeg is absent).
async function processVideoFile(root: string, src: string): Promise<string> {
  const base = cleanBase(src);
  if ((await tools()).ffmpeg) {
    const name = base + '.mp4';
    await processVideoCmd(src, join(root, 'public', name));
    return '/' + name;
  }
  const name = base + '.' + extOf(src);
  await copyFile(src, join(root, 'public', name));
  return '/' + name;
}

/** Pick + compress an image into public/. */
export async function importPublicImage(root: string): Promise<string | null> {
  const src = await pickFile('Images', IMAGE_EXTS);
  return src ? processImageFile(root, src) : null;
}

/** Pick + compress a video into public/. */
export async function importPublicVideo(root: string): Promise<string | null> {
  const src = await pickFile('Videos', VIDEO_EXTS);
  return src ? processVideoFile(root, src) : null;
}

/** Pick an image OR video and compress it appropriately. */
export async function importPublicMedia(root: string): Promise<string | null> {
  const src = await pickFile('Media', [...IMAGE_EXTS, ...VIDEO_EXTS]);
  if (!src) return null;
  return isVideoExt(src) ? processVideoFile(root, src) : processImageFile(root, src);
}

/** Pick a 3D model (STEP/OBJ/GLB) and convert + optimize it to GLB in public/. */
export async function importPublicModel(root: string): Promise<string | null> {
  const src = await pickFile('3D models', MODEL_EXTS);
  if (!src) return null;
  const base = cleanBase(src);
  const ext = extOf(src);
  if ((await tools()).node) {
    const name = base + '.glb';
    await convertModelCmd(root, src, join(root, 'public', name));
    return '/' + name;
  }
  if (ext === 'glb' || ext === 'gltf') {
    const name = base + '.' + ext;
    await copyFile(src, join(root, 'public', name));
    return '/' + name;
  }
  throw new Error('Converting STEP/OBJ needs Node.js. Import a .glb instead, or run the CMS where Node is available.');
}

/** Import any file into public/ unchanged (e.g. a PDF constitution). */
export async function importPublicFile(root: string, extensions: string[]): Promise<string | null> {
  const src = await pickFile('File', extensions);
  if (!src) return null;
  const name = cleanBase(src) + '.' + extOf(src);
  await copyFile(src, join(root, 'public', name));
  return '/' + name;
}

/* ------------------------------------------------------- generic collections */

export type Collection<T extends { id: string }> = {
  REL: string;
  label: string;
  /** Valid records only (invalid files are logged and skipped). */
  list: (root: string) => Promise<T[]>;
  read: (root: string, id: string) => Promise<T>;
  save: (root: string, item: unknown) => Promise<T>;
  create: (root: string, seed: unknown) => Promise<T>;
  remove: (root: string, id: string) => Promise<void>;
};

/** Build a CRUD wrapper for a "one JSON file per record" content folder. */
function makeCollection<T extends { id: string }>(rel: string, schema: ZodType<T>, label: string): Collection<T> {
  const dirOf = (root: string) => join(root, rel);
  const fileOf = (root: string, id: string) => join(root, rel, `${id}.json`);
  return {
    REL: rel,
    label,
    async list(root) {
      const entries = await listDir(dirOf(root)).catch(() => [] as DirEntry[]);
      const items: T[] = [];
      for (const entry of entries) {
        if (entry.is_dir || !entry.name.endsWith('.json')) continue;
        try {
          const parsed = schema.safeParse(JSON.parse(await readTextFile(join(dirOf(root), entry.name))));
          if (parsed.success) items.push(parsed.data);
          else console.error(`Invalid ${label} ${entry.name}:`, parsed.error.message);
        } catch (err) {
          console.error(`Could not read ${label} ${entry.name}:`, err);
        }
      }
      return items;
    },
    async read(root, id) {
      return schema.parse(JSON.parse(await readTextFile(fileOf(root, id))));
    },
    async save(root, item) {
      const validated = schema.parse(item);
      await writeTextFile(fileOf(root, validated.id), JSON.stringify(validated, null, 2) + '\n');
      return validated;
    },
    async create(root, seed) {
      const validated = schema.parse(seed);
      const file = fileOf(root, validated.id);
      if (await pathExists(file)) throw new Error(`A ${label} with id "${validated.id}" already exists.`);
      await writeTextFile(file, JSON.stringify(validated, null, 2) + '\n');
      return validated;
    },
    async remove(root, id) {
      await removeFile(fileOf(root, id));
    },
  };
}

export const seasonsApi = makeCollection<Season>('src/content/seasons', SeasonSchema, 'season');
export const peopleApi = makeCollection<Person>('src/content/people', PersonSchema, 'person');
export const rolesApi = makeCollection<Role>('src/content/roles', RoleSchema, 'role');
export const subteamsApi = makeCollection<Subteam>('src/content/subteams', SubteamSchema, 'subteam');
export const sponsorsApi = makeCollection<Sponsor>('src/content/sponsors', SponsorSchema, 'sponsor');
export const rocketsApi = makeCollection<Rocket>('src/content/rockets', RocketSchema, 'rocket');
export const eventsApi = makeCollection<EventItem>('src/content/events', EventSchema, 'event');
export const constitutionApi = makeCollection<Constitution>('src/content/constitution', ConstitutionSchema, 'constitution');
export const albumsApi = makeCollection<Album>('src/content/gallery', AlbumSchema, 'album');

/* ------------------------------------------------------------------- news */

export type NewsSummary = {
  slug: string;
  title: string;
  status: string;
  date?: string;
  displayDate?: string;
  season: string;
  tags: string[];
  blockCount: number;
  valid: boolean;
  error?: string;
};

export async function listNews(root: string): Promise<NewsSummary[]> {
  const dir = join(root, NEWS_REL);
  const entries = await listDir(dir).catch(() => [] as DirEntry[]);
  const posts: NewsSummary[] = [];
  for (const entry of entries) {
    if (!entry.is_dir) continue;
    const file = join(dir, entry.name, 'index.json');
    if (!(await pathExists(file))) continue;
    try {
      const raw = JSON.parse(await readTextFile(file)) as Record<string, unknown>;
      const parsed = NewsPostSchema.safeParse(raw);
      if (parsed.success) {
        const p = parsed.data;
        posts.push({ slug: entry.name, title: p.title, status: p.status, date: p.date, displayDate: p.displayDate, season: p.season, tags: p.tags, blockCount: p.blocks.length, valid: true });
      } else {
        posts.push({ slug: entry.name, title: typeof raw.title === 'string' ? raw.title : entry.name, status: typeof raw.status === 'string' ? raw.status : 'unknown', season: typeof raw.season === 'string' ? raw.season : '', tags: Array.isArray(raw.tags) ? (raw.tags as string[]) : [], blockCount: Array.isArray(raw.blocks) ? raw.blocks.length : 0, valid: false, error: parsed.error.message });
      }
    } catch (err) {
      posts.push({ slug: entry.name, title: entry.name, status: 'unknown', season: '', tags: [], blockCount: 0, valid: false, error: String(err) });
    }
  }
  posts.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  return posts;
}

export async function readNews(root: string, slug: string): Promise<NewsPost> {
  return NewsPostSchema.parse(JSON.parse(await readTextFile(join(root, NEWS_REL, slug, 'index.json'))));
}

export async function saveNews(root: string, slug: string, data: unknown): Promise<NewsPost> {
  const validated = NewsPostSchema.parse(data);
  await writeTextFile(join(root, NEWS_REL, slug, 'index.json'), JSON.stringify(validated, null, 2) + '\n');
  return validated;
}

export async function createNews(root: string, slug: string, title: string): Promise<NewsPost> {
  const file = join(root, NEWS_REL, slug, 'index.json');
  if (await pathExists(file)) throw new Error(`A post with slug "${slug}" already exists.`);
  const draft = NewsPostSchema.parse({ type: 'news', id: slug, title, status: 'draft', blocks: [] });
  await writeTextFile(file, JSON.stringify(draft, null, 2) + '\n');
  return draft;
}

export async function deleteNews(root: string, slug: string): Promise<void> {
  await removeDir(join(root, NEWS_REL, slug));
}

/* --------------------------------------------------------------- singletons */

export async function readSite(root: string): Promise<Site> {
  const file = join(root, SITE_REL);
  if (!(await pathExists(file))) return SiteSchema.parse({});
  return SiteSchema.parse(JSON.parse(await readTextFile(file)));
}

export async function saveSite(root: string, data: unknown): Promise<Site> {
  const validated = SiteSchema.parse(data);
  await writeTextFile(join(root, SITE_REL), JSON.stringify(validated, null, 2) + '\n');
  return validated;
}

export async function readAbout(root: string): Promise<About> {
  const file = join(root, ABOUT_REL);
  if (!(await pathExists(file))) return AboutSchema.parse({});
  return AboutSchema.parse(JSON.parse(await readTextFile(file)));
}

export async function saveAbout(root: string, data: unknown): Promise<About> {
  const validated = AboutSchema.parse(data);
  await writeTextFile(join(root, ABOUT_REL), JSON.stringify(validated, null, 2) + '\n');
  return validated;
}

/* ----------------------------------------------------------- preview server */

export const PREVIEW_PORT = 4321;

/** True if something is listening on the preview port. */
export const previewStatus = (port = PREVIEW_PORT) => invoke<boolean>('preview_status', { port });
/** Spawn the site's Vite dev server (no-op if already running). */
export const startPreview = (root: string, port = PREVIEW_PORT) => invoke<void>('start_preview', { root, port });
/** Stop the server; resolves true only if the port is actually free afterwards. */
export const stopPreview = (port = PREVIEW_PORT) => invoke<boolean>('stop_preview', { port });
/** Forcefully free the port (fallback when a polite stop fails). */
export const killPort = (port = PREVIEW_PORT) => invoke<void>('kill_port', { port });

/* -------------------------------------------------------------------- git */

export type GitStatus = { branch: string; changes: string[]; clean: boolean };

export const gitStatus = (root: string) => invoke<GitStatus>('git_status', { root });
export const gitCommit = (root: string, message: string) => invoke<string>('git_commit', { root, message });
export const gitPush = (root: string) => invoke<string>('git_push', { root });

export type { NewsPost, Person, Role, Subteam, Sponsor, Rocket, EventItem, Constitution, Season, Album, About, Site };
