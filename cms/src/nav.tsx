import type { IconName } from './components/icons';

/**
 * Single source of truth for the CMS's navigation and the task guides shown in
 * the Help tab. App (sidebar), Help (guide cards), and Dashboard (quick actions
 * + chips) all read from here so labels, colors, and icons never drift apart.
 */

export type Section =
  | 'dashboard' | 'help'
  | 'seasons' | 'people' | 'roles' | 'subteams' | 'rockets'
  | 'sponsors' | 'events' | 'constitution'
  | 'news' | 'gallery' | 'site' | 'about'
  | 'assets'
  | 'preview' | 'publish';

export type NavItem = { key: Section; label: string; icon: IconName };
export type NavGroup = { label: string; color: string; items: NavItem[] };

/** Each group has a signature accent color used across the chrome. */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    color: '#38bdf8', // sky
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
      { key: 'help', label: 'Help', icon: 'help' },
    ],
  },
  {
    label: 'Organization',
    color: '#a78bfa', // violet
    items: [
      { key: 'seasons', label: 'Seasons', icon: 'seasons' },
      { key: 'people', label: 'People', icon: 'people' },
      { key: 'roles', label: 'Roles', icon: 'roles' },
      { key: 'subteams', label: 'Subteams', icon: 'subteams' },
      { key: 'rockets', label: 'Rockets', icon: 'rockets' },
      { key: 'sponsors', label: 'Sponsors', icon: 'sponsors' },
      { key: 'events', label: 'Events', icon: 'events' },
      { key: 'constitution', label: 'Constitution', icon: 'constitution' },
    ],
  },
  {
    label: 'Content',
    color: '#fbbf24', // amber
    items: [
      { key: 'news', label: 'News', icon: 'news' },
      { key: 'gallery', label: 'Gallery', icon: 'gallery' },
      { key: 'site', label: 'Site', icon: 'site' },
      { key: 'about', label: 'About', icon: 'about' },
    ],
  },
  {
    label: 'Tools',
    color: '#2dd4bf', // teal
    items: [
      { key: 'assets', label: 'Assets', icon: 'media' },
    ],
  },
  {
    label: 'Publish',
    color: '#4ade80', // green
    items: [
      { key: 'preview', label: 'Preview', icon: 'preview' },
      { key: 'publish', label: 'Publish', icon: 'publish' },
    ],
  },
];

/** key -> label and key -> group accent color, derived once from NAV_GROUPS. */
export const SECTION_LABEL = Object.fromEntries(
  NAV_GROUPS.flatMap((g) => g.items.map((i) => [i.key, i.label])),
) as Record<Section, string>;

export const SECTION_ICON = Object.fromEntries(
  NAV_GROUPS.flatMap((g) => g.items.map((i) => [i.key, i.icon])),
) as Record<Section, IconName>;

export const SECTION_COLOR = Object.fromEntries(
  NAV_GROUPS.flatMap((g) => g.items.map((i) => [i.key, g.color])),
) as Record<Section, string>;

/** A "how do I…" task guide rendered in the Help tab. */
export type Guide = {
  id: string;
  title: string;
  /** Tabs this task touches; the first is the primary "Go to" target. */
  tabs: Section[];
  steps: string[];
};

export const GUIDES: Guide[] = [
  {
    id: 'media-workflow',
    title: 'How media works: upload once in Assets, pick anywhere',
    tabs: ['assets'],
    steps: [
      'All photos, videos, 3D models, and PDFs live in one place: Tools → Assets.',
      'To add a NEW file from your computer, open Tools → Assets and use an Import button. That is the ONLY place files come in.',
      'Everywhere else (a person’s photo, a rocket’s model, a news image, the constitution PDF…), click “Choose…” and pick from the files already in Assets — you don’t upload from those screens.',
      'If the file you need isn’t listed when you click “Choose…”, import it in Tools → Assets first, then come back and pick it.',
      'Tip: clean out anything marked “not used” in Assets to keep the project tidy.',
    ],
  },
  {
    id: 'add-member',
    title: 'Add a new team member',
    tabs: ['people', 'seasons'],
    steps: [
      'Open the People tab and click “＋ New”.',
      "Type the person's full name and click Create.",
      'Fill in their photo, major, bio, and links. Use the Privacy switches to control what shows publicly (for example, turn off “Show email” to hide it).',
      'Click Save.',
      'To put them on the team page, open Seasons → the current season → Roster, click “＋ Add roster entry”, and choose the person and their role.',
      'Click Save, then Publish to make it live.',
    ],
  },
  {
    id: 'remove-member',
    title: 'Remove a member',
    tabs: ['seasons', 'people'],
    steps: [
      'To take someone off this year’s team page only: open Seasons → current season → Roster and click Delete on their roster row. Their People record is kept for history.',
      'To delete the person entirely: open People, find their card, and click Delete. This removes their JSON file.',
      'Click Save, then Publish.',
    ],
  },
  {
    id: 'add-role',
    title: 'Add a new role',
    tabs: ['roles'],
    steps: [
      'Open the Roles tab and click “＋ New”.',
      'Type the role name (e.g. “Avionics Lead”) and click Create.',
      'Set its Category and Description, and tick the flags (Leadership / Subteam role / Active).',
      'Use Display order to control where it appears (lower = first).',
      'Click Save, then Publish.',
    ],
  },
  {
    id: 'remove-role',
    title: 'Remove a role',
    tabs: ['roles'],
    steps: [
      'If anyone is still assigned that role in a season roster, update those entries in Seasons first.',
      'Open Roles, find the role, and click Delete on its card.',
      'Click Save, then Publish.',
    ],
  },
  {
    id: 'assign-role',
    title: 'Assign a role to someone',
    tabs: ['seasons'],
    steps: [
      'Roles are assigned per season. Open Seasons and pick the season (usually the current one).',
      'Scroll to Roster and click “＋ Add roster entry”, or edit an existing row.',
      'Choose the Person, then choose their Role. Optionally pick a Subteam.',
      'Turn on “Show on team page” if they should appear publicly.',
      'Click Save, then Publish.',
    ],
  },
  {
    id: 'new-subteam',
    title: 'Create a new subteam',
    tabs: ['subteams', 'seasons'],
    steps: [
      'Open the Subteams tab and click “＋ New”.',
      'Type the subteam name and click Create.',
      'Add a short and long description, pick an icon, and set its status to Active.',
      'Click Save.',
      'To show it as active this year, open Seasons → current season → “Active subteams this season” and tick the new subteam.',
      'Click Save, then Publish.',
    ],
  },
  {
    id: 'update-constitution',
    title: 'Update the constitution',
    tabs: ['constitution'],
    steps: [
      'Open the Constitution tab and click “＋ New” to start a new version (title “Constitution”, id like 2026-1).',
      'Set the Version, Effective season, and Date approved, then Import the PDF.',
      'List what changed under “Summary of changes”.',
      'Set this version’s Status to “current”, and set the previous version to “archived” so exactly one is current.',
      'Click Save, then Publish.',
    ],
  },
  {
    id: 'add-season',
    title: 'Start a new season',
    tabs: ['seasons'],
    steps: [
      'Open Seasons and click “＋ New season”.',
      'Enter the season name (e.g. “2026–2027 Season”) and id (e.g. 2026-2027), then Create.',
      'Set Status to “current”, and set last year’s season to “archived”.',
      'Fill in the theme, current rocket, active subteams, roster, sponsors, and advisors.',
      'Click Save, then Publish.',
    ],
  },
  {
    id: 'add-event',
    title: 'Add an event',
    tabs: ['events'],
    steps: [
      'Open the Events tab and click “＋ New”.',
      'Type the event title and click Create.',
      'Set the Season id, Category, Date, Location, and Description.',
      'If it already happened, add a placement/result and any awards.',
      'Click Save, then Publish.',
    ],
  },
  {
    id: 'feature-event',
    title: 'Feature an event on the homepage',
    tabs: ['events'],
    steps: [
      'Open Events and select the event (create it first if needed).',
      'Turn on the “Feature as a homepage announcement” switch.',
      'Add a Flyer image, and optionally a CTA label + link (e.g. “RSVP” → a link).',
      'Click Save, then Publish — it appears as an announcement on the homepage.',
    ],
  },
  {
    id: 'add-news',
    title: 'Write a news article',
    tabs: ['news'],
    steps: [
      'Open the News tab and click “＋ New post”.',
      'Type the title and click “Create draft” — this opens the post editor.',
      'Add content blocks (text, images, etc.) and fill in the date and season.',
      'When it’s ready, set the status to “published”.',
      'Save the post, then open Publish and push.',
    ],
  },
  {
    id: 'feature-sponsor',
    title: 'Add and feature a sponsor',
    tabs: ['sponsors', 'seasons'],
    steps: [
      'Open the Sponsors tab, click “＋ New”, and create the sponsor record (name, logo, website).',
      'Click Save.',
      'Open Seasons → current season → Sponsors, click “＋ Add sponsor”, and pick the sponsor and tier.',
      'Turn on “Show on homepage” to feature them.',
      'Click Save, then Publish.',
    ],
  },
  {
    id: 'edit-homepage',
    title: 'Edit the homepage hero, links & footer',
    tabs: ['site'],
    steps: [
      'Open the Site tab.',
      'Edit the organization name, tagline, and headline lines for the hero.',
      'Add or reorder call-to-action buttons and set where each one goes.',
      'Update the social links and footer text.',
      'Click Save, then Publish.',
    ],
  },
  {
    id: 'edit-about',
    title: 'Edit the About section',
    tabs: ['about'],
    steps: [
      'Open the About tab.',
      'Edit the mission paragraphs, the “what we do” highlight cards, the stats, and the join call-to-action.',
      'Click Save, then Publish.',
    ],
  },
  {
    id: 'add-gallery',
    title: 'Add photos to the gallery',
    tabs: ['gallery'],
    steps: [
      'Open the Gallery tab and click “＋ New” to create an album (optionally tie it to a season).',
      'Inside the album, click “＋ Add photo”, then “Choose…” to pick an image (import new ones first in Tools → Assets), and add a title and alt text.',
      'Click Save, then Publish. The homepage shows the current season’s albums.',
    ],
  },
  {
    id: 'manage-assets',
    title: 'Manage photos, videos, 3D models & files',
    tabs: ['assets'],
    steps: [
      'Open Tools → Assets to see every file: “On the website” (public/) grouped into Images, Videos, 3D models, and Other, plus “Source files” (models/) like the raw rocket OBJ and STEP CAD.',
      'Each file shows its size. A “not used” badge on a website file means nothing references it — safe to delete to keep the project lean.',
      'Click any 3D model (GLB or OBJ) to open the viewer — drag to rotate, and toggle individual components on/off in the side panel.',
      'Source files (raw OBJ/STEP) aren’t on the live site. To put a rocket on the website, click “Convert for web” to make a small optimized GLB in public/.',
      'A “large” badge means the file is heavier than recommended. Before uploading, open “What should I upload?” for the right formats and sizes — avoid 4K photos and raw video.',
      'Use the Import buttons to add new media; each file is sorted into the correct subfolder automatically.',
    ],
  },
  {
    id: 'publish',
    title: 'Publish your changes (go live)',
    tabs: ['publish', 'preview'],
    steps: [
      'Saving an editor only writes files to your computer — it does NOT update the website yet.',
      'Tip: use the Preview tab to see the site with your changes first.',
      'When you’re ready, open the Publish tab.',
      'Review the changed files, type a short message, and click Commit.',
      'Click Push — the website redeploys with your changes.',
    ],
  },
];
