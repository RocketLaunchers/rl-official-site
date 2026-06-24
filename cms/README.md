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
- **ffmpeg** on PATH — compresses images/videos on import (without it, files are
  copied uncompressed). Node also handles 3D-model conversion on import.
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

## Media handling

The CMS **converts and compresses media on import**, so the repo never holds large
files — only small, web-ready assets land in `public/`:

- **Images** → resized (max 1920px) and re-encoded to **WebP** (ffmpeg).
- **Videos** → transcoded to compressed **H.264 MP4**, max 1080p (ffmpeg).
- **3D models** (`.step` / `.stp` / `.obj` / `.glb` / `.gltf`) → converted to an
  optimized, quantized **GLB** via `scripts/convert-model.mjs` (Node + occt +
  gltf-transform). The website only ever loads GLB — no STEP/WASM at runtime.

If ffmpeg/Node aren't on PATH, imports fall back to a plain copy.

> **PCBs / detail:** a STEP file is solid geometry only — usually little color and
> **no copper traces or silkscreen** (those are 2D layers STEP doesn't carry). For a
> board that shows silkscreen, traces, and true component colors, export **GLB/glTF
> directly from KiCad** (File → Export → GLTF) and import that — the CMS just
> optimizes it. Batch-convert STEP sources in `models/` with
> `node scripts/step-to-glb.mjs`.

## Notes

- The shared schema is currently aliased (`@portfolio/content-schema` →
  `../src/content/schema.ts`) in `vite.config.ts` + `tsconfig.json`. When the site
  moves under `apps/`, promote it to a real `packages/content-schema` package.
- `src-tauri/icons/icon.png` is a generated placeholder (see `scripts/generate-icon.mjs`).
