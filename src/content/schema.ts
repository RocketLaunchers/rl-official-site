import { z } from 'zod';

/**
 * Shared content schema for the Rocket Launchers org site.
 *
 * This is the single source of truth for what valid content looks like. The
 * site loaders validate against it at build time (invalid content fails the
 * build), and the local CMS validates against the same rules before saving. It
 * is intentionally framework-agnostic so it can be lifted into a shared
 * workspace package — keep it free of React/Vite imports.
 *
 * Modeling philosophy: the org is **season-based**. People, roles, subteams,
 * sponsors, rockets, events, and constitution versions are reusable records. A
 * `Season` connects them together (it embeds the roster / sponsorship / advisor
 * links for that year). New years create a new season instead of overwriting
 * history.
 */

/* ---------------------------------------------------------------- helpers */

const slug = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be lowercase kebab-case');

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD');

/* ------------------------------------------------------------------ blocks */

const blockBase = {
  /** Stable id used by the CMS for reorder/duplicate. Unique within a post. */
  id: z.string().min(1),
};

export const HeadingBlock = z.object({
  ...blockBase,
  type: z.literal('heading'),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2),
  /** May contain inline markdown (e.g. **bold**, [link](url)). */
  text: z.string(),
});

export const ParagraphBlock = z.object({
  ...blockBase,
  type: z.literal('paragraph'),
  /** May contain inline markdown. */
  text: z.string(),
});

export const ImageBlock = z.object({
  ...blockBase,
  type: z.literal('image'),
  /** Relative to the post folder (assets/foo.jpg) or absolute/external. */
  src: z.string().default(''),
  alt: z.string().optional(),
  caption: z.string().optional(),
});

export const VideoBlock = z.object({
  ...blockBase,
  type: z.literal('video'),
  /** Relative to the post folder (videos/foo.mp4) or absolute/external. */
  src: z.string().default(''),
  caption: z.string().optional(),
  controls: z.boolean().default(true),
  muted: z.boolean().default(false),
  autoplay: z.boolean().default(false),
  loop: z.boolean().default(false),
});

export const ListBlock = z.object({
  ...blockBase,
  type: z.literal('list'),
  ordered: z.boolean().default(false),
  /** Each item may contain inline markdown. */
  items: z.array(z.string()).min(1),
});

export const CodeBlock = z.object({
  ...blockBase,
  type: z.literal('code'),
  language: z.string().optional(),
  code: z.string(),
});

export const QuoteBlock = z.object({
  ...blockBase,
  type: z.literal('quote'),
  text: z.string(),
});

export const DividerBlock = z.object({
  ...blockBase,
  type: z.literal('divider'),
});

export const CalloutBlock = z.object({
  ...blockBase,
  type: z.literal('callout'),
  variant: z.enum(['info', 'warning', 'success', 'note']).default('info'),
  text: z.string(),
});

export const Block = z.discriminatedUnion('type', [
  HeadingBlock,
  ParagraphBlock,
  ImageBlock,
  VideoBlock,
  ListBlock,
  CodeBlock,
  QuoteBlock,
  DividerBlock,
  CalloutBlock,
]);

export type Block = z.infer<typeof Block>;
export type BlockType = Block['type'];

/* ------------------------------------------------------------- shared media */

/** One item in a media gallery: an image, a video, or a 3D model (GLB/STEP). */
export const MediaItemSchema = z.object({
  type: z.enum(['image', 'video', 'model']).default('image'),
  /** Public path (/foo.png, /foo.glb) or external URL. */
  src: z.string().default(''),
  alt: z.string().optional(),
  caption: z.string().optional(),
});

export const GalleryItemSchema = z.object({
  id: z.union([z.string(), z.number()]),
  src: z.string().default(''),
  alt: z.string().default(''),
  title: z.string().default(''),
  description: z.string().default(''),
});

/* -------------------------------------------------------------------- news */

/**
 * News / updates posts (formerly the portfolio blog). Block-based body, same
 * editor and renderer. Optionally tagged to a season.
 */
export const NewsPostSchema = z
  .object({
    type: z.literal('news').default('news'),
    /** URL slug; must match the folder name. */
    id: slug,
    title: z.string().min(1),
    status: z.enum(['draft', 'published']).default('published'),
    /** ISO date (YYYY-MM-DD) — sortable. */
    date: isoDate.optional(),
    /** Human-friendly date shown in the UI (e.g. "October 18, 2025"). */
    displayDate: z.string().optional(),
    /** Season id this post belongs to (optional). */
    season: z.string().default(''),
    excerpt: z.string().default(''),
    readTime: z.string().default(''),
    tags: z.array(z.string()).default([]),
    coverImage: z.string().nullable().optional(),
    blocks: z.array(Block).default([]),
  })
  .superRefine((post, ctx) => {
    if (post.status === 'published') {
      if (!post.date) {
        ctx.addIssue({ code: 'custom', path: ['date'], message: 'published posts need a date' });
      }
      if (post.blocks.length === 0) {
        ctx.addIssue({ code: 'custom', path: ['blocks'], message: 'published posts need at least one block' });
      }
    }
  });

/* ------------------------------------------------------------------ people */

export const PersonLinksSchema = z.object({
  email: z.string().default(''),
  linkedin: z.string().default(''),
  github: z.string().default(''),
  website: z.string().default(''),
});

/** Consent-based publishing flags. Email is private by default. */
export const PersonPrivacySchema = z.object({
  showPublicly: z.boolean().default(true),
  showPhoto: z.boolean().default(true),
  showCompany: z.boolean().default(true),
  showLinkedin: z.boolean().default(true),
  showEmail: z.boolean().default(false),
});

/**
 * One reusable person record. The same profile is referenced from season
 * rosters, advisor assignments, rocket credits, and the alumni page — entered
 * once, reused everywhere.
 */
export const PersonSchema = z.object({
  type: z.literal('person').default('person'),
  id: slug,
  name: z.string().min(1),
  photo: z.string().default(''),
  major: z.string().default(''),
  gradYear: z.number().int().nullable().default(null),
  bio: z.string().default(''),
  links: PersonLinksSchema.default({ email: '', linkedin: '', github: '', website: '' }),
  /** Accumulates once they graduate; their old season roles are preserved. */
  isAlumni: z.boolean().default(false),
  /** Where they went after graduating (company / grad school). */
  company: z.string().default(''),
  privacy: PersonPrivacySchema.default({
    showPublicly: true,
    showPhoto: true,
    showCompany: true,
    showLinkedin: true,
    showEmail: false,
  }),
});

/* ------------------------------------------------------------------- roles */

/**
 * A reusable, non-hardcoded officer/subteam role definition. Roles are assigned
 * to people per-season via the season roster, so the org structure can change
 * every year without code changes.
 */
export const RoleSchema = z.object({
  type: z.literal('role').default('role'),
  id: slug,
  name: z.string().min(1),
  /** e.g. "Executive", "Engineering", "Operations", "Subteam Lead". Free text. */
  category: z.string().default(''),
  description: z.string().default(''),
  displayOrder: z.number().default(0),
  isLeadership: z.boolean().default(false),
  isSubteamRole: z.boolean().default(false),
  active: z.boolean().default(true),
});

/* ---------------------------------------------------------------- subteams */

export const SUBTEAM_STATUSES = ['active', 'archived', 'proposed'] as const;

/**
 * A subteam identity that can persist across years. Its lead and members come
 * from the per-season roster; this record holds the durable description.
 */
export const SubteamSchema = z.object({
  type: z.literal('subteam').default('subteam'),
  id: slug,
  name: z.string().min(1),
  shortDescription: z.string().default(''),
  longDescription: z.string().default(''),
  /** Icon name from the highlight icon registry (rocket, cpu, ...). */
  icon: z.string().default('rocket'),
  image: z.string().default(''),
  skills: z.array(z.string()).default([]),
  tools: z.array(z.string()).default([]),
  status: z.enum(SUBTEAM_STATUSES).default('active'),
  /** Season id the subteam was created in. */
  createdSeason: z.string().default(''),
  /** Rocket ids this subteam contributes systems to. */
  relatedRockets: z.array(z.string()).default([]),
  media: z.array(MediaItemSchema).default([]),
  displayOrder: z.number().default(0),
});

/* ---------------------------------------------------------------- sponsors */

/** A reusable sponsor record. Their per-season support lives on the season. */
export const SponsorSchema = z.object({
  type: z.literal('sponsor').default('sponsor'),
  id: slug,
  name: z.string().min(1),
  logo: z.string().default(''),
  website: z.string().default(''),
  description: z.string().default(''),
  industry: z.string().default(''),
  contact: z.string().default(''),
});

/* ----------------------------------------------------------------- rockets */

export const ROCKET_STATUSES = [
  'Concept',
  'In Design',
  'Manufacturing',
  'Testing',
  'Launched',
  'Retired',
] as const;

export const RocketSpecsSchema = z.object({
  targetAltitude: z.string().default(''),
  motor: z.string().default(''),
  diameter: z.string().default(''),
  length: z.string().default(''),
  mass: z.string().default(''),
});

export const RocketSubsystemSchema = z.object({
  name: z.string().min(1),
  summary: z.string().default(''),
});

/**
 * A rocket. Each rocket page is a permanent archive entry. A rocket can span
 * multiple seasons.
 */
export const RocketSchema = z.object({
  type: z.literal('rocket').default('rocket'),
  id: slug,
  name: z.string().min(1),
  /** Season ids this rocket belongs to. */
  seasons: z.array(z.string()).default([]),
  status: z.enum(ROCKET_STATUSES).default('Concept'),
  mission: z.string().default(''),
  competition: z.string().default(''),
  specs: RocketSpecsSchema.default({ targetAltitude: '', motor: '', diameter: '', length: '', mass: '' }),
  heroImage: z.string().default(''),
  /** Optional STEP/GLB shown as an interactive 3D viewer. */
  model3d: z.string().default(''),
  /** Build/launch media gallery (images / videos / 3D models). */
  media: z.array(MediaItemSchema).default([]),
  subsystems: z.array(RocketSubsystemSchema).default([]),
  results: z.string().default(''),
  lessonsLearned: z.string().default(''),
  /** Subteam ids that contributed. */
  relatedSubteams: z.array(z.string()).default([]),
  /** Person ids credited. */
  credits: z.array(z.string()).default([]),
  displayOrder: z.number().default(0),
});

/* ------------------------------------------------------------------ events */

export const EVENT_CATEGORIES = [
  'competition',
  'launch',
  'meeting',
  'outreach',
  'social',
  'other',
] as const;

export const EventSchema = z.object({
  type: z.literal('event').default('event'),
  id: slug,
  title: z.string().min(1),
  /** Season id this event belongs to. */
  season: z.string().default(''),
  date: isoDate.optional(),
  displayDate: z.string().default(''),
  location: z.string().default(''),
  category: z.enum(EVENT_CATEGORIES).default('other'),
  description: z.string().default(''),
  /** Competition/event logo (public path /foo.png or external URL). */
  logo: z.string().default(''),
  /** Headline result, e.g. "2nd Place — 10,000 ft COTS". Shown as a badge. */
  placement: z.string().default(''),
  /** Individual awards / recognitions earned at this event. */
  awards: z.array(z.string()).default([]),
  /** When true, this event is promoted as a homepage announcement. */
  featured: z.boolean().default(false),
  /** Promotional flyer/poster image (public path or URL) for the announcement. */
  flyer: z.string().default(''),
  /** Optional call-to-action label for the announcement (e.g. "RSVP"). */
  ctaLabel: z.string().default(''),
  /** CTA destination: a route (/path), an in-page section (#join), or a URL. */
  ctaHref: z.string().default(''),
  media: z.array(MediaItemSchema).default([]),
});

/* ------------------------------------------------------------- constitution */

export const CONSTITUTION_STATUSES = ['current', 'archived', 'draft'] as const;

/**
 * A version-controlled constitution document. Versions accumulate; the current
 * one is the single record with status "current".
 */
export const ConstitutionSchema = z.object({
  type: z.literal('constitution').default('constitution'),
  id: slug,
  title: z.string().min(1),
  version: z.string().default(''),
  /** Season id this version is effective for. */
  effectiveSeason: z.string().default(''),
  dateApproved: isoDate.optional(),
  displayDate: z.string().default(''),
  approvedBy: z.string().default(''),
  /** Public path to the PDF (/constitution-2026.pdf). */
  pdf: z.string().default(''),
  /** Optional block-based web version. */
  body: z.array(Block).default([]),
  summaryOfChanges: z.array(z.string()).default([]),
  status: z.enum(CONSTITUTION_STATUSES).default('draft'),
});

/* ------------------------------------------------------------------ gallery */

/** A gallery album, optionally tied to a season. */
export const AlbumSchema = z.object({
  type: z.literal('album').default('album'),
  id: slug,
  title: z.string().min(1),
  season: z.string().default(''),
  description: z.string().default(''),
  items: z.array(GalleryItemSchema).default([]),
  displayOrder: z.number().default(0),
});

/* ------------------------------------------------------------------ seasons */

export const SEASON_STATUSES = ['current', 'archived', 'upcoming'] as const;

export const ADVISOR_CATEGORIES = [
  'Faculty Advisor',
  'Launch Mentor',
  'Technical Mentor',
  'Industry Mentor',
] as const;

export const DEFAULT_SPONSOR_TIERS = [
  'Platinum',
  'Gold',
  'Silver',
  'Bronze',
  'In-kind',
  'Partner',
] as const;

/** One person-holds-a-role link for a given season. */
export const RosterEntrySchema = z.object({
  person: z.string().min(1),
  role: z.string().min(1),
  /** Optional subteam id this assignment belongs to. */
  subteam: z.string().default(''),
  displayOnTeam: z.boolean().default(true),
  displayOrder: z.number().default(0),
});

/** One sponsor's support for a given season. */
export const SponsorEntrySchema = z.object({
  sponsor: z.string().min(1),
  /** Tier name — must be one of the season's `sponsorTiers`. */
  tier: z.string().default(''),
  supportTypes: z.array(z.string()).default([]),
  publicDescription: z.string().default(''),
  showOnHomepage: z.boolean().default(true),
  displayOrder: z.number().default(0),
});

/** One advisor/mentor's support for a given season. */
export const AdvisorEntrySchema = z.object({
  person: z.string().min(1),
  category: z.enum(ADVISOR_CATEGORIES).default('Faculty Advisor'),
  supportRole: z.string().default(''),
  description: z.string().default(''),
  featured: z.boolean().default(false),
  displayOrder: z.number().default(0),
});

/**
 * The connector record. A season embeds the year-specific links (roster /
 * sponsors / advisors) and points at the current rocket + active subteams.
 * Events, news, constitution versions, and gallery albums point back to a
 * season id, so they are derived rather than duplicated here.
 */
export const SeasonSchema = z.object({
  type: z.literal('season').default('season'),
  id: slug,
  name: z.string().min(1),
  startDate: isoDate.optional(),
  endDate: isoDate.optional(),
  status: z.enum(SEASON_STATUSES).default('upcoming'),
  /** Optional slogan / theme. */
  theme: z.string().default(''),
  /** Rocket id featured this season. */
  currentRocket: z.string().default(''),
  /** Active subteam ids, in display order. */
  subteams: z.array(z.string()).default([]),
  /** Tier names for this season (definable per season). */
  sponsorTiers: z.array(z.string()).default([...DEFAULT_SPONSOR_TIERS]),
  roster: z.array(RosterEntrySchema).default([]),
  sponsors: z.array(SponsorEntrySchema).default([]),
  advisors: z.array(AdvisorEntrySchema).default([]),
  endOfYearSummary: z.string().default(''),
  displayOrder: z.number().default(0),
});

/* -------------------------------------------------------------------- site */

/** A hero call-to-action: label + a scroll target (section id) or route (/path). */
export const CtaSchema = z.object({
  label: z.string().default(''),
  target: z.string().default(''),
});

/** External/social links used across the header and footer. */
export const SiteLinksSchema = z.object({
  github: z.string().default(''),
  linkedin: z.string().default(''),
  instagram: z.string().default(''),
  youtube: z.string().default(''),
  discord: z.string().default(''),
  email: z.string().default(''),
});

export const SiteFooterSchema = z.object({
  copyright: z.string().default(''),
  rights: z.string().default(''),
});

export const SiteSchema = z.object({
  /** Organization name. */
  name: z.string().default(''),
  /** Short tagline shown under the hero title. */
  tagline: z.string().default(''),
  headlines: z.array(z.string()).default([]),
  ctas: z.array(CtaSchema).default([]),
  links: SiteLinksSchema.default({ github: '', linkedin: '', instagram: '', youtube: '', discord: '', email: '' }),
  footer: SiteFooterSchema.default({ copyright: '', rights: '' }),
});

/* ------------------------------------------------------------------- about */

/** Icon names the highlight picker offers; rendered to SVG in the UI. */
export const TRAIT_ICON_NAMES = [
  'code',
  'book',
  'puzzle',
  'bolt',
  'cpu',
  'lightbulb',
  'users',
  'rocket',
  'star',
] as const;

/** A "what we do" highlight card. */
export const HighlightSchema = z.object({
  icon: z.string().default('rocket'),
  title: z.string().min(1),
  description: z.string().default(''),
});

export const AboutListSchema = z.object({
  title: z.string().default(''),
  items: z.array(z.string()).default([]),
});

/** Join / get-involved call to action on the about/home page. */
export const JoinSchema = z.object({
  title: z.string().default(''),
  body: z.string().default(''),
  ctaLabel: z.string().default(''),
  ctaHref: z.string().default(''),
});

export const AboutSchema = z.object({
  sectionTitle: z.string().default('ABOUT THE CLUB'),
  image: z.string().default(''),
  imageAlt: z.string().default(''),
  paragraphs: z.array(z.string()).default([]),
  highlights: z.array(HighlightSchema).default([]),
  stats: AboutListSchema.default({ title: '', items: [] }),
  join: JoinSchema.default({ title: '', body: '', ctaLabel: '', ctaHref: '' }),
});

/* ------------------------------------------------------------------- types */

export type MediaItem = z.infer<typeof MediaItemSchema>;
export type GalleryItem = z.infer<typeof GalleryItemSchema>;
export type NewsPost = z.infer<typeof NewsPostSchema>;
export type Person = z.infer<typeof PersonSchema>;
export type PersonLinks = z.infer<typeof PersonLinksSchema>;
export type PersonPrivacy = z.infer<typeof PersonPrivacySchema>;
export type Role = z.infer<typeof RoleSchema>;
export type Subteam = z.infer<typeof SubteamSchema>;
export type Sponsor = z.infer<typeof SponsorSchema>;
export type RocketSpecs = z.infer<typeof RocketSpecsSchema>;
export type RocketSubsystem = z.infer<typeof RocketSubsystemSchema>;
export type Rocket = z.infer<typeof RocketSchema>;
export type EventItem = z.infer<typeof EventSchema>;
export type Constitution = z.infer<typeof ConstitutionSchema>;
export type Album = z.infer<typeof AlbumSchema>;
export type RosterEntry = z.infer<typeof RosterEntrySchema>;
export type SponsorEntry = z.infer<typeof SponsorEntrySchema>;
export type AdvisorEntry = z.infer<typeof AdvisorEntrySchema>;
export type Season = z.infer<typeof SeasonSchema>;
export type Cta = z.infer<typeof CtaSchema>;
export type SiteLinks = z.infer<typeof SiteLinksSchema>;
export type Site = z.infer<typeof SiteSchema>;
export type Highlight = z.infer<typeof HighlightSchema>;
export type AboutList = z.infer<typeof AboutListSchema>;
export type Join = z.infer<typeof JoinSchema>;
export type About = z.infer<typeof AboutSchema>;
