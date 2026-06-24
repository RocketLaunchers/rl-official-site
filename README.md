# Portfolio

A personal portfolio website **plus a local desktop CMS** to manage its content
without touching code. The site is a static single-page app; all of its content
lives in validated JSON files; a Tauri desktop app edits those files; and a git
push redeploys the site.

```
┌────────────────────────┐
│  Desktop CMS (Tauri)   │  edit content · import media · live preview · git push
└───────────┬────────────┘
            │ writes (validated by the shared schema)
            ▼
┌────────────────────────┐
│  src/content/**/*.json │  the single source of truth for all page content
└───────────┬────────────┘
            │ import.meta.glob + Zod.parse at build  (invalid content fails the build)
            ▼
┌────────────────────────┐
│  Vite + React SPA      │  renders the content into the website
└───────────┬────────────┘
            │ git push → auto-deploy
            ▼
┌────────────────────────┐
│  GitHub → Render        │  static hosting
└────────────────────────┘
```

The guiding principle: **the CMS manages _content_; the code owns _design_.**
There is no visual page builder, no per-page styling, no database — just
structured JSON and a website that knows how to render it.

## How it works

- **Content is JSON.** Everything shown on the site (the title page, blog posts,
  projects, community gallery, about section, and the external links) is stored
  as JSON under `src/content/`. Nothing user-facing is hard-coded in components.
- **One shared schema is the contract.** `src/content/schema.ts` defines, with
  [Zod](https://zod.dev), exactly what valid content looks like. The website
  validates against it at build time (so broken content fails `vite build` and
  can never ship), and the CMS validates against the *same* schema before saving
  (so it can never write content the site would reject).
- **The website renders, the CMS edits.** React components read the JSON and
  decide how it looks. The desktop app only decides *what content exists* and
  *in what order* — it writes the JSON files and copies media into `public/`.
- **Git is the publish button.** Saving in the CMS just changes files on disk.
  Committing and pushing triggers the host to rebuild and redeploy.

## Website features

Beyond the content system, the site itself has a few notable pieces — all owned
by the code, not the CMS:

- **Animated space background.** A custom WebGL/Three.js starfield that slowly
  cruises through space behind every page. The nebulae are generated
  procedurally with domain-warped fractal Brownian motion (fBm) for turbulent,
  filamentary gas, with multi-color emission palettes and star clusters
  importance-sampled from the gas density so the stars sit in the bright
  filaments. It's lazy-loaded and code-split (Three.js stays out of the initial
  bundle), caps its frame rate / resolution on mobile, pauses when the tab is
  hidden, and respects `prefers-reduced-motion`. See
  [`src/components/SpaceBackground.tsx`](src/components/SpaceBackground.tsx).
- **Interactive 3D model viewer.** Project and blog media can include 3D models,
  rendered in-browser with Three.js (orbit + zoom). CAD parts authored as STEP
  files are tessellated **once** at build time into a compact glTF/GLB mesh
  (`scripts/step-to-glb.mjs`, via the `occt-import-js` WASM kernel), so the site
  ships a small binary and loads it in well under a second — no heavy WASM at
  runtime. The viewer is lazy-loaded so it costs nothing until a model is shown.
- **Mixed media galleries.** Projects and blog posts can mix images, embedded
  video, and 3D models in a single gallery.
- **Image lightbox.** Clicking any content image opens a full-screen modal viewer.

## Tech stack

| Part | Stack |
|------|-------|
| Website | Vite + React + TypeScript, React Router, Tailwind CSS |
| Content | JSON files validated by a shared Zod schema |
| 3D / graphics | Three.js (WebGL) — animated starfield + model viewer; `occt-import-js` for STEP→glTF |
| Desktop CMS | Tauri v2 (Rust) + React + Vite + TypeScript |
| Tooling | pnpm workspace, ESLint |
| Hosting | Static build deployed on Render (SPA fallback via `_redirects`) |

## Repo structure

```
portfolio/
  src/                     # the website
    components/            #   React components (design): page sections, the
                           #   animated SpaceBackground, the 3D ModelViewer, …
    content/               #   ALL content as JSON + the shared schema
      schema.ts            #     Zod schema — the site/CMS contract
      blog/ projects/ …    #     one folder/file per content type
    data/                  #   loaders that glob + validate the JSON
  models/                  # source CAD (STEP) parts for the 3D viewer
  scripts/                 # build/convert utilities (STEP→GLB, markdown→JSON)
  public/                  # static assets (images, GLB models, resume, etc.)
  vite.config.ts           # build + dev asset pipeline
  cms/                     # the local desktop CMS (its own README)
    src/                   #   React UI
    src-tauri/             #   Rust backend (filesystem, preview server, git)
  pnpm-workspace.yaml      # links the site + cms
```

## Running the website

Prerequisites: Node + [pnpm](https://pnpm.io).

```bash
pnpm install        # install dependencies for the whole workspace
pnpm dev            # start the dev server (http://localhost:5173)
pnpm build          # production build → dist/
pnpm preview        # preview the production build
pnpm lint           # lint
```

To add or change content by hand you can edit the JSON in `src/content/` and the
site picks it up — but the CMS exists so you don't have to.

## Running the CMS

The CMS is a desktop app that opens this repo, edits its content, and publishes.

Prerequisites: Node + pnpm, **Rust + cargo**, and (on Linux) the Tauri webview
libraries (`webkit2gtk-4.1`, `gtk+-3.0`, `libsoup-3.0`, `javascriptcoregtk-4.1`).

```bash
pnpm install                              # once, from the repo root
pnpm --filter portfolio-cms tauri dev     # launch the desktop app
```

In the app, choose this repo's folder and start editing. Full details and a
production build command are in [`cms/README.md`](cms/README.md).

### What the CMS does

- **Home** — the title page (name, headline, call-to-action buttons), your
  external/social links, and the footer.
- **Blog** — create, edit, reorder, and delete posts and their content blocks
  (headings, paragraphs, images, video, lists, code, quotes, callouts, dividers),
  with live image previews.
- **Projects** — manage the homepage project cards (text, links, order, and a
  media gallery of images, video, and 3D models).
- **Community** — manage the involvement gallery tiles.
- **About** — profile photo, bio, personality traits, education, focus, resume.
- **Preview** — a switch that starts/stops the site's own dev server and shows
  the **live website** in an embedded preview, so you can see changes before
  publishing.
- **Publish** — commit your changes and push, which triggers a redeploy.

Every editor validates against the shared schema on save, imports media into
`public/`, and never lets you edit the structural plumbing — only content.

## Deployment

The site is a static build (`pnpm build` → `dist/`) served on Render, which
redeploys automatically when changes are pushed. The CMS's **Publish** tab does
the commit + push for you; or use git directly.

## More docs

- [`cms/README.md`](cms/README.md) — running and building the desktop CMS.
- [`CMS_PLAN.md`](CMS_PLAN.md) — the design/refactor plan behind this system.
```
