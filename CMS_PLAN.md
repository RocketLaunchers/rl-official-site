# Local CMS + JSON Content Refactor Plan

> Adapted to the **actual** codebase. The earlier draft assumed Astro + content
> collections; this repo is a **Vite + React 18 + TypeScript SPA**. This plan
> rewrites the original to fit what we actually have, and frames the work as a
> refactor of the existing markdown blog system into a validated JSON content
> system that a local Tauri CMS can safely edit.

---

## 0. What this codebase actually is (and why the original plan changes)

| Original plan assumed | Reality in this repo | Consequence for the plan |
|---|---|---|
| Astro static site | Vite + React 18 + `react-router-dom` v7 SPA | No content collections, no `content.config.ts`. We load content with `import.meta.glob` (already used) and validate with **Zod**. |
| Astro schema validation | No validation today | Add a shared **Zod schema**; the site's loader throws on invalid content → a bad file fails `vite build` (same safety net Astro would give). |
| Invent a block model | **A block model already exists** | `BlogPost.content.sections[]` (`text \| heading \| image \| video`) is rendered by a `switch` in `BlogPost.tsx`. JSON `blocks[]` ≈ existing `sections[]`. We promote it to disk and delete the parser. |
| Content types: blog, projects, community | Real types: **blog, projects, gallery, videos** (no "community") | Drop "community". Add projects/gallery/videos, which are currently **hardcoded in components**. |
| Pages have blocks | Only blog posts are documents | Routes are just `/` and `/blog/:id`. Projects/gallery/videos are **homepage sections** = flat records, not block documents. |
| `/content/*.json` + `/public/media/...` | Blogs use **colocated** `src/blogs/<slug>/assets|videos`, served via a custom Vite middleware + `vite-plugin-static-copy` | Keep the colocated model and the working asset pipeline; just generalize the path. Don't rewrite media handling. |
| Render auto-deploy on git push | **Correct** — static SPA, `_redirects` SPA fallback, "hosted on Render" | Keep this part as-is. |

### Current content reality
- **Blogs** — `src/blogs/<slug>/index.md` (YAML-ish frontmatter + markdown body), assets colocated in `assets/` and `videos/`. Loaded at build time by `src/data/blogPosts.ts` via `import.meta.glob('../blogs/*/index.md', { eager, query: '?raw' })`, then parsed by the custom `src/utils/parseBlogPost.ts` (uses `marked.lexer`, custom `[video: …]` embed syntax, rewrites relative media URLs to `/blogs/<slug>/…`). Rendered by `src/components/BlogPost.tsx`; listed by `Blog.tsx`.
- **Projects** — hardcoded array in `src/components/Projects.tsx` (7 entries: title/status/image/description/tags/github/deploymentUrl). Images in flat `public/*.png`.
- **Gallery** — hardcoded `galleryImages` array in `src/components/Gallery.tsx`. Images in flat `public/*.jpg`.
- **Videos** — hardcoded `portfolioVideos` in `src/data/videos.ts` with a `VideoData` interface. **Note: `Videos.tsx`/`VideoGallery.tsx` are not mounted anywhere** — this is dormant code; treat it as low priority.
- **About / Hero / Header** — hardcoded copy. Out of scope for v1 (design, not content).

### The custom markdown parser is lossy — JSON fixes that (a real upside to sell)
`parseBlogPost.ts` flattens structure: all headings collapse to `<h2>` (no level), lists become `• `-prefixed text lines, code and blockquotes become plain text, and inline markdown is pre-rendered to **HTML strings** stored in the section and dumped via `dangerouslySetInnerHTML`. Moving to JSON blocks lets us **preserve** heading level, list items, code language, and quotes, and store clean editable text instead of HTML.

---

## 1. Main goal (unchanged in spirit)

Build a **local desktop CMS** that edits **structured JSON content blocks** so the
portfolio can be updated without touching code — while the React app keeps full
control of design. The CMS manages **content**; the website owns **how it looks**.

Same non-goals as before: no visual page builder, no per-page CSS/fonts/colors,
no raw HTML/markdown editing, no database.

---

## 2. Stack (corrected)

**Website (keep what's here):**
- Vite 5 + React 18 + TypeScript
- `react-router-dom` v7 (client routing; `/` and `/blog/:id`)
- Tailwind CSS
- **Add:** `zod` for runtime content validation
- **Remove after migration:** `marked`, `src/utils/parseBlogPost.ts`, `src/types/md-raw.d.ts`, the `?raw` markdown glob

**Desktop CMS (as originally proposed):**
- Tauri + React + TypeScript + Rust commands
- Reads/writes JSON content files and copies media into the right folder
- Optional git commands for publishing

**Hosting (unchanged):**
- GitHub repo → Render Static Site → auto-deploy on push
- Build: `vite build` → `dist/`; SPA fallback via `_redirects`

---

## 3. Repo structure

A pnpm workspace was just added (`pnpm-workspace.yaml`, `pnpm-lock.yaml` are
untracked) — a clear signal we're moving toward a monorepo. Lean into it so the
**site and CMS share one Zod schema** instead of duplicating it:

```txt
portfolio-new/
  pnpm-workspace.yaml
  packages/
    content-schema/         # NEW — shared Zod schemas + TS types
      src/index.ts          #   BlogPostSchema, ProjectSchema, GallerySchema, VideoSchema, Block union
  apps/
    site/                   # the current Vite app moves here (or stays at root for v1)
      src/
        content/            # NEW home for JSON content (replaces src/blogs)
          blog/
            marv/
              index.json
              assets/...    # colocated media (same pattern as today)
              videos/...
          projects/
            sentinel.json   # flat record (no blocks)
          gallery/
            index.json      # single ordered list
          videos/
            index.json      # single ordered list
        components/
          BlockRenderer.tsx # NEW — extracted from BlogPost.tsx switch
        data/
          blogPosts.ts      # becomes a thin JSON loader + validator
        vite.config.ts
      public/               # flat images for projects/gallery stay here
    cms/                    # NEW — Tauri app
      src/
      src-tauri/
```

**Pragmatic v1 shortcut:** moving the whole app into `apps/site` is optional. To
minimize churn you can keep the site at the repo root, add `packages/content-schema`,
add `cms/` as a sibling, and only do the `apps/` move later. Recommendation: do the
content + schema refactor first (Phase 0–1) **without** moving folders, then decide
on the monorepo layout once it's working.

---

## 4. Content model

### 4a. Blog post — a block document (`src/content/blog/<slug>/index.json`)

This mirrors today's `BlogPost` + `content.sections[]` but **enriched** and with
new `status`/`date` handling:

```json
{
  "type": "blog",
  "id": "marv",
  "title": "MARV Prototyping",
  "status": "published",
  "date": "2025-10-18",
  "displayDate": "October 18, 2025",
  "excerpt": "Blog documenting the initial development of MARV…",
  "readTime": "4 min read",
  "tags": ["Avionics", "Rust", "Embedded", "System Design"],
  "coverImage": "assets/MARV-Current.jpg",
  "blocks": [
    { "id": "blk_001", "type": "heading", "level": 1, "text": "Developing MARV" },
    { "id": "blk_002", "type": "paragraph", "text": "Welcome to this **documentation** series…" },
    { "id": "blk_003", "type": "list", "ordered": false, "items": ["Soldered storage", "Modular reliability"] },
    { "id": "blk_004", "type": "image", "src": "assets/Brunito-RIP.jpg", "alt": "Broken telemetry bay", "caption": "" },
    { "id": "blk_005", "type": "video", "src": "videos/clip.mp4", "caption": "Systems check", "controls": true, "muted": false, "autoplay": false, "loop": false },
    { "id": "blk_006", "type": "code", "language": "rust", "code": "fn main() {}" },
    { "id": "blk_007", "type": "quote", "text": "Measure twice, fly once." },
    { "id": "blk_008", "type": "divider" },
    { "id": "blk_009", "type": "callout", "variant": "info", "text": "HIL/SIL testing recommended." }
  ]
}
```

Key decisions vs. today:
- **Media `src` stays relative** (`assets/…`, `videos/…`). The loader rewrites to
  the public URL (`/content/blog/<slug>/assets/…`) — same idea as `rewriteMediaUrl`,
  just moved from parse-time to load-time. External/absolute URLs pass through.
- **Inline markdown stays as plain text in JSON** (e.g. `**bold**`), rendered with
  `marked.parseInline` **at render time** in `BlockRenderer`. We do **not** store
  HTML in JSON — keeps files clean and CMS-editable. (`dangerouslySetInnerHTML` on
  single-author, trusted content is acceptable; document it.)
- **`status`** is new (today everything is implicitly published).
- **`date`** is ISO (sortable) + optional **`displayDate`** for the human string
  currently used (e.g. "October 18, 2025"). Fixes the fragile `Date.parse` sort.

### 4b. Project — a flat record (`src/content/projects/<slug>.json`)

Maps 1:1 to the hardcoded object in `Projects.tsx`. No blocks (projects are cards,
not pages). `statusColor` is **derived in the renderer** from `status`, not stored.

```json
{
  "type": "project",
  "id": "sentinel",
  "title": "SENTINEL",
  "status": "Completed",
  "order": 40,
  "image": "/sentinel.png",
  "description": "Next-generation rocket telemetry system…",
  "tags": ["Rust", "Tauri", "Tailwind", "JavaScript", "React"],
  "github": "https://github.com/andrewalvrz/SENTINEL",
  "deploymentUrl": null
}
```

### 4c. Gallery & Videos — ordered lists

`src/content/gallery/index.json` maps to `galleryImages`; `src/content/videos/index.json`
maps to `VideoData[]`. Same fields they already have, just externalized.

---

## 5. Block types for MVP

Ground the original's block list in the existing renderer. Today's renderer handles
`heading | text | image | video`. Add the rest incrementally:

| Block | Status today | Work |
|---|---|---|
| `heading` (+ `level`) | exists (level lost) | add `level` 1–3 |
| `paragraph` (`text`) | exists | rename `text`→`paragraph` in schema; keep inline markdown |
| `image` | exists | unchanged |
| `video` | exists (`[video:…]` syntax) | drop the custom syntax; it's now a JSON block |
| `list` (`items[]`, `ordered`) | flattened to `•` text | render as real `<ul>/<ol>` |
| `code` (`language`) | flattened to text | render as `<pre><code>` |
| `quote` | flattened to text | render as `<blockquote>` |
| `divider` | none | new |
| `callout` (`variant`) | none | new |

A blog page is still just **metadata + ordered list of blocks**. The CMS can add,
edit, reorder, duplicate, and delete blocks.

---

## 6. Website refactor (Phase 0 — do this first)

The site must consume JSON before the CMS is worth building. Concrete edits:

1. **Add `packages/content-schema`** with Zod schemas + inferred TS types for
   `Block` (discriminated union on `type`), `BlogPost`, `Project`, `GalleryItem`,
   `Video`. Export the types that `blogPosts.ts`/`videos.ts` currently declare.
2. **Extract `BlockRenderer.tsx`** from the `switch` in `BlogPost.tsx` (lines ~66–119).
   `BlogPost.tsx` keeps the page chrome (header, tags, nav) and renders
   `<BlockRenderer blocks={post.blocks} />`. Extend the switch for `list/code/quote/divider/callout`.
3. **Rewrite `src/data/blogPosts.ts`** as a thin JSON loader:
   ```ts
   const files = import.meta.glob('../content/blog/*/index.json', { eager: true });
   // for each: BlogPostSchema.parse(...), rewrite media src → /content/blog/<slug>/…,
   // filter status==='published' in prod (keep drafts in dev), sort by ISO date desc
   ```
   Zod `.parse` here means **invalid content fails the build** — our schema safety net.
4. **Externalize Projects/Gallery/Videos**: replace the hardcoded arrays with
   `import.meta.glob('../content/<type>/*.json', { eager: true })` (validated),
   and derive `statusColor` in `Projects.tsx`.
5. **Generalize the asset pipeline in `vite.config.ts`**: today the dev middleware
   matches `^/blogs/<slug>/(assets|videos)/…` and static-copy reads `src/blogs/*`.
   Point both at `src/content/blog/*` (and serve at `/content/blog/<slug>/…`). This
   is a path change, not a rewrite — the working mechanism stays.
6. **Migration script** (`scripts/md-to-json.ts`, run once with `tsx`): reuse the
   existing `parseBlogPost.ts` to convert each `src/blogs/<slug>/index.md` →
   `src/content/blog/<slug>/index.json`, move `assets/`+`videos/` alongside,
   default `status: "published"`, set ISO `date` from the existing string. Manually
   enrich heading levels / lists where the lossy parser dropped them.
7. **Delete after migration**: `marked` dep, `parseBlogPost.ts`,
   `parseBlogPost.sanity.ts`, `md-raw.d.ts`, the `?raw` glob, and `src/blogs/`.

At the end of Phase 0 you can hand-create a JSON file and see a page render — with
**no CMS yet**.

---

## 7. Rendering model (corrected to React)

- Per-type containers are React components, not `.astro` layouts:
  `BlogPost.tsx` (exists) is the blog renderer; `Projects.tsx`/`Gallery.tsx` are
  the list renderers.
- One shared **`BlockRenderer.tsx`** switches on `block.type` (the original's
  `BlockRenderer.astro`, in React).
- Inline markdown (`**bold**`, links) handled by `marked.parseInline` inside the
  renderer (the only remaining use of `marked`; optionally swap for a tiny inline
  formatter later to drop the dep entirely).

---

## 8. Validation rules

Enforced by the shared Zod schema (CMS validates pre-save; site validates at build):
- Title non-empty; slug unique + URL-safe (slug = folder/file name).
- Published posts require `date` (ISO) and at least one block.
- `excerpt`/`description` present.
- Image/video `src` resolves to a real colocated file (CMS checks the path on disk;
  build can warn).
- Blocks have valid fields per type; block `id`s unique within a post.
- Video URLs / external `src` well-formed.

Because the loader calls `.parse`, **broken content fails `vite build`** — the
guarantee the original plan wanted from Astro, achieved with Zod.

---

## 9. Draft vs published

New concept (`status: "draft" | "published"`). The blog loader filters to
`published` for production builds and includes drafts in `vite dev` so the CMS
preview can show them. Projects/gallery/videos can adopt the same flag if useful.

Workflow: write draft → preview locally (`vite dev`) → mark published → `vite build`
→ git push → Render deploys.

---

## 10. Git workflow (unchanged from original)

MVP: show changed files, **Commit** button, **Push** button, show command output,
auto-suggest a message like `Update content: MARV prototyping`. Later: branches,
pull, deploy status. Single editor assumed for v1.

---

## 11. Implementation phases (re-sequenced for this repo)

- **Phase 0 — Site JSON refactor** (Section 6). Schema package, `BlockRenderer`,
  JSON loaders, generalized asset pipeline, MD→JSON migration, delete the parser.
  *Exit:* hand-authored JSON renders; build validates content. No CMS yet.
- **Phase 1 — Externalize remaining content.** Projects/Gallery/Videos → JSON.
  *Exit:* zero hardcoded content arrays in components.
- **Phase 2 — Tauri CMS skeleton.** Open repo folder, validate structure (see §12),
  list blog JSON, open one, edit metadata + block text, save JSON. No git.
- **Phase 3 — Block controls.** Add/delete/duplicate/move blocks; image/video/code
  block creation. Makes the CMS actually useful.
- **Phase 4 — Preview & validation.** Run `pnpm dev`/`pnpm build` from the app
  (Tauri shell), open preview, surface Zod errors and broken media paths inline.
- **Phase 5 — Media management.** Import media into the post's colocated
  `assets/`/`videos/` (or `public/` for projects/gallery), clean filenames, pick
  cover/image source, warn before deleting referenced media.
- **Phase 6 — Git publishing.** Status, commit, push, show result, link to Render.

---

## 12. Tauri project-picker validation (corrected markers)

Validate **this** repo, not an Astro one. Check for:
- `package.json` with a `vite build` script
- `src/content/` (new content root) — or `src/blogs/` pre-migration
- `vite.config.ts`
- `packages/content-schema` (shared schema) — so the CMS can import the same Zod
  rules the site uses
- `public/` for flat project/gallery images

(The original's `src/content.config.ts` check is Astro-specific — drop it.)

---

## 13. What not to build yet (unchanged)

User accounts, cloud sync, a database, a freeform rich-text/layout editor, custom
CSS/theme editing, collaboration, comments, analytics, plugins. Goal stays:
**update the portfolio in 5 minutes without touching code.**

---

## 14. Final architecture

```txt
   ┌────────────────────────┐
   │  Tauri Local CMS App   │  edits JSON, copies media, runs git
   └───────────┬────────────┘
               │ writes (validated by shared Zod schema)
               ▼
   ┌────────────────────────┐
   │ src/content/**/*.json   │  blog (blocks) · projects · gallery · videos
   │ + colocated assets      │
   └───────────┬────────────┘
               │ import.meta.glob + Zod.parse at build (invalid → build fails)
               ▼
   ┌────────────────────────┐
   │  Vite + React SPA       │  BlockRenderer + component renderers
   └───────────┬────────────┘
               │ vite build → dist/  (Render auto-deploy on push)
               ▼
   ┌────────────────────────┐
   │  GitHub → Render Static │
   └────────────────────────┘
```

### Recommendation
Same conclusion as the original — **a local block-based CMS, not a visual page
builder** — but realized as:

```txt
Structured JSON content  (promoted from the existing sections model)
+ shared Zod schema      (validates in CMS and at build; replaces Astro schemas)
+ React BlockRenderer    (extracted from the current BlogPost switch)
+ Tauri + git publishing
+ Render static hosting
```

The single biggest insight from reading the code: **you already have a block model
and an asset pipeline that work.** This is mostly a *promotion + validation*
refactor (move sections to JSON on disk, add Zod, delete the markdown parser), not
a green-field build.
```
