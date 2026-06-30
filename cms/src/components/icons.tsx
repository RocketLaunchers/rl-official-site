import type { ReactNode, SVGProps } from 'react';

/**
 * Small inline icon set for the CMS chrome — nav items + a few UI glyphs.
 * All icons stroke `currentColor` so they take the color of their context
 * (nav-group accent, button text, etc.). No external dependency.
 */

export type IconName =
  | 'dashboard' | 'help' | 'seasons' | 'people' | 'roles' | 'subteams'
  | 'rockets' | 'sponsors' | 'events' | 'constitution' | 'news' | 'gallery'
  | 'site' | 'about' | 'preview' | 'publish' | 'media'
  | 'image' | 'film' | 'cube' | 'file' | 'eye' | 'eyeoff'
  | 'sun' | 'moon' | 'chevron' | 'arrow' | 'search';

type Props = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 16, children, ...rest }: Props & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

const PATHS: Record<IconName, ReactNode> = {
  dashboard: (<><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></>),
  help: (<><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 1-1 1.7" /><path d="M12 17h.01" /></>),
  seasons: (<><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></>),
  people: (<><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0" /><path d="M16 5.5a3 3 0 0 1 0 5M21 20a5.5 5.5 0 0 0-4-5.3" /></>),
  roles: (<><path d="M12 2l2.5 5 5.5.8-4 3.9.9 5.5L12 14.5 7.1 17.2l.9-5.5-4-3.9 5.5-.8z" /></>),
  subteams: (<><circle cx="6" cy="6" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="12" cy="18" r="2.5" /><path d="M6 8.5v3a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-3M12 13.5v2" /></>),
  rockets: (<><path d="M12 3c3 1.5 5 4.5 5 8 0 2-.6 3.6-1.5 5h-7C7.6 14.6 7 13 7 11c0-3.5 2-6.5 5-8z" /><circle cx="12" cy="10" r="1.6" /><path d="M9 19l-2 2M15 19l2 2" /></>),
  sponsors: (<><path d="M12 21s-7-4.4-9-8.5C1.6 9.3 3 6 6.2 6c1.9 0 3 1 3.8 2.2C10.8 7 11.9 6 13.8 6 17 6 18.4 9.3 21 12.5 19 16.6 12 21 12 21z" /></>),
  events: (<><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /><path d="M9 14l2 2 4-4" /></>),
  constitution: (<><path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><path d="M14 3v5h5M8 13h8M8 17h8M8 9h3" /></>),
  news: (<><path d="M4 5h12v14a1 1 0 0 0 1 1H6a2 2 0 0 1-2-2z" /><path d="M16 8h3a1 1 0 0 1 1 1v9a2 2 0 0 1-2 2M7 8h6M7 12h6M7 16h4" /></>),
  gallery: (<><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9" r="1.6" /><path d="M21 16l-5-5L5 20" /></>),
  site: (<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" /></>),
  media: (<><rect x="8" y="3" width="13" height="13" rx="2" /><circle cx="12.5" cy="7.5" r="1.4" /><path d="M21 12l-4-4-5.5 5.5" /><path d="M16 16v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3" /></>),
  image: (<><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9" r="1.6" /><path d="M21 16l-5-5L5 20" /></>),
  film: (<><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 4v16M17 4v16M3 9h4M3 14h4M17 9h4M17 14h4" /></>),
  cube: (<><path d="M12 2l8 4.5v9L12 22l-8-4.5v-9z" /><path d="M12 22V11M4 6.5l8 4.5 8-4.5" /></>),
  file: (<><path d="M6 3h8l5 5v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><path d="M14 3v5h5" /></>),
  eye: (<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></>),
  eyeoff: (<><path d="M3 3l18 18" /><path d="M10.6 10.6a3 3 0 0 0 4.2 4.2" /><path d="M9.9 5.1A9.4 9.4 0 0 1 12 5c6.5 0 10 7 10 7a16 16 0 0 1-2.9 3.8M6.2 6.2A16 16 0 0 0 2 12s3.5 7 10 7a9.3 9.3 0 0 0 3.1-.5" /></>),
  about: (<><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>),
  preview: (<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></>),
  publish: (<><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" /></>),
  sun: (<><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>),
  moon: (<><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.5 6.5 0 0 0 9.8 9.8z" /></>),
  chevron: (<><path d="M6 9l6 6 6-6" /></>),
  arrow: (<><path d="M5 12h14M13 6l6 6-6 6" /></>),
  search: (<><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></>),
};

export function Icon({ name, size, ...rest }: { name: IconName } & Props) {
  return <Svg size={size} {...rest}>{PATHS[name]}</Svg>;
}
