import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import {
  BlogPostSchema,
  ProjectSchema,
  GallerySchema,
  AboutSchema,
  SiteSchema,
  type BlogPost,
  type Project,
  type Gallery,
  type About,
  type Site,
} from '@portfolio/content-schema';

/**
 * API layer over the Tauri backend (generic fs + copy commands, dialog plugin,
 * asset protocol) and the shared content schema. Every content type is read,
 * validated, and written here so the React screens stay declarative. Content
 * is validated with the same Zod schema the website uses.
 */

export const BLOG_REL = 'src/content/blog';
export const PROJECTS_REL = 'src/content/projects';
export const GALLERY_REL = 'src/content/gallery/index.json';
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
  const result = await open({ directory: true, multiple: false, title: 'Select your portfolio repo' });
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
    { label: 'blog content', rel: 'src/content/blog', required: true },
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
const MEDIA_EXTS = [...IMAGE_EXTS, 'mp4', 'webm', 'ogv', 'mov'];

async function pickFile(name: string, extensions: string[]): Promise<string | null> {
  const r = await open({ multiple: false, filters: [{ name, extensions }] });
  return typeof r === 'string' ? r : null;
}

/** Import an image into public/, returns the stored src ("/file.png") or null. */
export async function importPublicImage(root: string): Promise<string | null> {
  const src = await pickFile('Images', IMAGE_EXTS);
  if (!src) return null;
  const name = basename(src);
  await copyFile(src, join(root, 'public', name));
  return '/' + name;
}

/** Import any file into public/, returns the stored href ("/file.pdf") or null. */
export async function importPublicFile(root: string, extensions: string[]): Promise<string | null> {
  const src = await pickFile('File', extensions);
  if (!src) return null;
  const name = basename(src);
  await copyFile(src, join(root, 'public', name));
  return '/' + name;
}

/** Import an image OR video into public/, returns the stored src ("/file.mp4"). */
export async function importPublicMedia(root: string): Promise<string | null> {
  const src = await pickFile('Media', MEDIA_EXTS);
  if (!src) return null;
  const name = basename(src);
  await copyFile(src, join(root, 'public', name));
  return '/' + name;
}

/* ------------------------------------------------------------------- blog */

export type PostSummary = {
  slug: string;
  title: string;
  status: string;
  date?: string;
  displayDate?: string;
  tags: string[];
  blockCount: number;
  valid: boolean;
  error?: string;
};

export async function listPosts(root: string): Promise<PostSummary[]> {
  const dir = join(root, BLOG_REL);
  const entries = await listDir(dir).catch(() => [] as DirEntry[]);
  const posts: PostSummary[] = [];
  for (const entry of entries) {
    if (!entry.is_dir) continue;
    const file = join(dir, entry.name, 'index.json');
    if (!(await pathExists(file))) continue;
    try {
      const raw = JSON.parse(await readTextFile(file)) as Record<string, unknown>;
      const parsed = BlogPostSchema.safeParse(raw);
      if (parsed.success) {
        const p = parsed.data;
        posts.push({ slug: entry.name, title: p.title, status: p.status, date: p.date, displayDate: p.displayDate, tags: p.tags, blockCount: p.blocks.length, valid: true });
      } else {
        posts.push({ slug: entry.name, title: typeof raw.title === 'string' ? raw.title : entry.name, status: typeof raw.status === 'string' ? raw.status : 'unknown', tags: Array.isArray(raw.tags) ? (raw.tags as string[]) : [], blockCount: Array.isArray(raw.blocks) ? raw.blocks.length : 0, valid: false, error: parsed.error.message });
      }
    } catch (err) {
      posts.push({ slug: entry.name, title: entry.name, status: 'unknown', tags: [], blockCount: 0, valid: false, error: String(err) });
    }
  }
  posts.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  return posts;
}

export async function readPost(root: string, slug: string): Promise<BlogPost> {
  return BlogPostSchema.parse(JSON.parse(await readTextFile(join(root, BLOG_REL, slug, 'index.json'))));
}

export async function savePost(root: string, slug: string, data: unknown): Promise<BlogPost> {
  const validated = BlogPostSchema.parse(data);
  await writeTextFile(join(root, BLOG_REL, slug, 'index.json'), JSON.stringify(validated, null, 2) + '\n');
  return validated;
}

export async function createPost(root: string, slug: string, title: string): Promise<BlogPost> {
  const file = join(root, BLOG_REL, slug, 'index.json');
  if (await pathExists(file)) throw new Error(`A post with slug "${slug}" already exists.`);
  const draft = BlogPostSchema.parse({ type: 'blog', id: slug, title, status: 'draft', blocks: [] });
  await writeTextFile(file, JSON.stringify(draft, null, 2) + '\n');
  return draft;
}

export async function deletePost(root: string, slug: string): Promise<void> {
  await removeDir(join(root, BLOG_REL, slug));
}

/* --------------------------------------------------------------- projects */

export async function listProjects(root: string): Promise<Project[]> {
  const dir = join(root, PROJECTS_REL);
  const entries = await listDir(dir).catch(() => [] as DirEntry[]);
  const projects: Project[] = [];
  for (const entry of entries) {
    if (entry.is_dir || !entry.name.endsWith('.json')) continue;
    try {
      const parsed = ProjectSchema.safeParse(JSON.parse(await readTextFile(join(dir, entry.name))));
      if (parsed.success) projects.push(parsed.data);
      else console.error(`Invalid project ${entry.name}:`, parsed.error.message);
    } catch (err) {
      console.error(`Could not read project ${entry.name}:`, err);
    }
  }
  projects.sort((a, b) => a.order - b.order);
  return projects;
}

export async function saveProject(root: string, project: unknown): Promise<Project> {
  const validated = ProjectSchema.parse(project);
  await writeTextFile(join(root, PROJECTS_REL, `${validated.id}.json`), JSON.stringify(validated, null, 2) + '\n');
  return validated;
}

export async function createProject(root: string, slug: string, title: string, order: number): Promise<Project> {
  const file = join(root, PROJECTS_REL, `${slug}.json`);
  if (await pathExists(file)) throw new Error(`A project with slug "${slug}" already exists.`);
  const project = ProjectSchema.parse({ type: 'project', id: slug, title, status: 'Completed', order, image: '', description: '', tags: [] });
  await writeTextFile(file, JSON.stringify(project, null, 2) + '\n');
  return project;
}

export async function deleteProject(root: string, slug: string): Promise<void> {
  await removeFile(join(root, PROJECTS_REL, `${slug}.json`));
}

/* ---------------------------------------------------------------- gallery */

export async function readGallery(root: string): Promise<Gallery> {
  const file = join(root, GALLERY_REL);
  if (!(await pathExists(file))) return GallerySchema.parse({});
  return GallerySchema.parse(JSON.parse(await readTextFile(file)));
}

export async function saveGallery(root: string, data: unknown): Promise<Gallery> {
  const validated = GallerySchema.parse(data);
  await writeTextFile(join(root, GALLERY_REL), JSON.stringify(validated, null, 2) + '\n');
  return validated;
}

/* ------------------------------------------------------------------ about */

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

/* ------------------------------------------------------------------- site */

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

export type { BlogPost, Project, Gallery, About, Site };
