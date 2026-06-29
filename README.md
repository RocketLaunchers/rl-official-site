# Rocket Launchers — Official Site + Local CMS

The public website for the **UTRGV Rocket Launchers** student organization, plus a local
desktop CMS for editing it. The site is a fast static React app; all content lives as
validated JSON in `src/content/` and is committed to git, so the whole history is preserved.

## The big idea: the org is season-based

The organization changes every year — officers, roles, subteams, sponsors, mentors, rockets,
and even the constitution. So nothing is hardcoded. Instead:

> People, roles, subteams, sponsors, rockets, and constitution versions are **reusable
> records**. A **Season** connects them together. A new year creates a new season instead of
> overwriting the old one.

That means past teams, rockets, sponsors, and constitutions are never deleted — they're
archived.

### Content model

```
Season (seasons/<year>.json)         ← the connector for one year
  ├── currentRocket  → a rocket id
  ├── subteams[]     → subteam ids active this season
  ├── roster[]       → { person, role, subteam? }   (who held which role)
  ├── sponsors[]     → { sponsor, tier, ... }        (this year's support)
  └── advisors[]     → { person, category, ... }     (faculty / mentors)

Reusable records (entered once, reused everywhere):
  people/<id>.json        roles/<id>.json        subteams/<id>.json
  sponsors/<id>.json      rockets/<id>.json      events/<id>.json
  constitution/<id>.json  gallery/<id>.json (albums)
  news/<slug>/index.json  (block-based posts, with colocated assets/ + videos/)

Singletons:
  site/index.json   (org name, hero text, links)
  about/index.json  (mission, highlights, join CTA)
```

Events, news, constitution versions, and gallery albums each reference a season by id, so the
site derives "this season's events / news / constitution" automatically.

Everything is validated by **one shared Zod schema**: [`src/content/schema.ts`](src/content/schema.ts).
Invalid content fails fast — both in the CMS (before saving) and on the site.

## Project layout

```
src/content/      JSON content (the source of truth) + schema.ts
src/data/         Build-time loaders (import.meta.glob + Zod) and org.ts (the relational resolver)
src/components/   Homepage sections + shared UI (Header, Footer, PersonCard, 3D viewer, …)
src/pages/        Routed pages (/team, /rockets, /sponsors, /alumni, /constitution, /news/:id)
public/           Images, 3D models (.glb), and other static assets
cms/              The local desktop CMS (Tauri + React) — see cms/README.md
```

## Running the site

```bash
pnpm install        # once, at the repo root (installs the workspace)
pnpm dev            # dev server with hot reload
pnpm build          # production build to dist/
pnpm preview        # preview the production build
```

## Running the CMS

The CMS is a desktop app that edits this repo's JSON content with a friendly UI, then commits
and pushes via git. See [`cms/README.md`](cms/README.md). In short:

```bash
pnpm --filter rocket-launchers-cms tauri dev    # desktop app (needs the Rust toolchain)
# or, the editor UI in a browser:
pnpm --filter rocket-launchers-cms dev
```

Point it at this repo folder. It validates against the same schema the site uses.

## Common tasks

- **Add a person** → create `src/content/people/<id>.json` (or use the CMS "People" screen).
  Enter them once; reference them from season rosters, advisor lists, and rocket credits.
- **Add/rename a role or subteam** → edit `roles/` or `subteams/`. They're not hardcoded.
- **Record this year's structure** → edit the current `seasons/<year>.json`: set the
  `currentRocket`, list active `subteams`, and add `roster` / `sponsors` / `advisors` entries.
- **Start a new season (rollover)** → create a new `seasons/<next-year>.json`, set the old
  season's `status` to `archived` and the new one to `current`. Copy the previous roster and
  edit it. Nothing from the old season is lost.
- **Publish the constitution** → add `constitution/<version>.json`, set its `status` to
  `current` (and the previous one to `archived`).

## Tech stack

Vite · React · TypeScript · Tailwind CSS · React Router · Zod · three.js (3D model viewer).
The CMS adds Tauri (Rust) for local filesystem + git, and reuses the site's Zod schema as the
single source of truth.
