# Portfolio CMS

A local desktop CMS (Tauri v2 + React) for editing the portfolio's JSON content.
It edits the same `src/content/**` files the website builds from, validated by the
**shared Zod schema** (`src/content/schema.ts`) — so the CMS can never save content
the site would reject.

```
Tauri shell (Rust)  ──►  generic fs commands (read/write/list) + folder picker
        ▲
        │ invoke
React frontend (Vite)  ──►  api.ts  ──►  BlogPostSchema (shared with the site)
        │
   Project Picker ─► Dashboard (list posts) ─► Editor (metadata + blocks → save JSON)
```

## Prerequisites

- Node + pnpm, Rust + cargo
- Linux: the Tauri webview deps (`webkit2gtk-4.1`, `gtk+-3.0`, `libsoup-3.0`,
  `javascriptcoregtk-4.1`). macOS/Windows: standard Tauri prerequisites.

## Run

From the repo root:

```bash
pnpm install                              # links the cms workspace package
pnpm --filter portfolio-cms tauri dev     # launches the desktop app (needs a display)
```

or from this folder: `cd cms && pnpm tauri dev`.

In the app: **Choose folder…** → select this repo → **Open**. The Dashboard lists
posts from `src/content/blog/*/index.json`; open one to edit its metadata and block
text, then **Save** (writes the validated JSON back to disk). Use git to publish.

## Build a distributable

```bash
pnpm --filter portfolio-cms tauri build
```

## Scope

**Implemented:** content CRUD for every page —
- **Blog:** list/create posts, edit metadata, add/move/duplicate/delete blocks,
  edit every block type, live image/video previews + import, and a
  website-faithful **Preview** toggle.
- **Projects:** create/edit/delete tiles (text, links, image, tags, order).
- **Community:** create/edit/remove gallery tiles (image, title, alt, description).
- **About:** traits CRUD (icon picker, title, description), bio paragraphs,
  profile image, education & focus lists, resume PDF — all with import + preview.
- **Preview:** a switch that starts/stops the site's own Vite dev server and shows
  the live website in an iframe (port 4321). The switch only flips off once the
  port is free; a **Kill port** button force-frees it otherwise.
- **Publish:** commit changes under "content update" and push so the site redeploys.

All saves are validated against the shared schema before writing.

**Next:** full-page live preview is already covered by the Preview tab; remaining
polish — extract `schema.ts` to `packages/content-schema`. See `../CMS_PLAN.md`.

## Notes

- The shared schema is currently aliased (`@portfolio/content-schema` →
  `../src/content/schema.ts`) in `vite.config.ts` + `tsconfig.json`. When the site
  moves under `apps/`, promote it to a real `packages/content-schema` package.
- `src-tauri/icons/icon.png` is a generated placeholder (see `scripts/generate-icon.mjs`).
