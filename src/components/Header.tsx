import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { site } from '../data/site';

type NavItem = { label: string; to: string };
type NavMenu = { label: string; items: NavItem[] };

const MENUS: NavMenu[] = [
  {
    label: 'ABOUT',
    items: [
      { label: 'The Team', to: '/team' },
      { label: 'Alumni', to: '/alumni' },
      { label: 'Sponsors', to: '/sponsors' },
      { label: 'Constitution', to: '/constitution' },
    ],
  },
  {
    label: 'PROJECTS',
    items: [
      { label: 'Rockets', to: '/rockets' },
      { label: 'Competitions', to: '/competitions' },
    ],
  },
  {
    label: 'HAPPENINGS',
    items: [
      { label: 'Events', to: '/events' },
      { label: 'News', to: '/news' },
    ],
  },
];

const Chevron = ({ open }: { open: boolean }) => (
  <svg
    className={`w-3 h-3 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m6 9 6 6 6-6" />
  </svg>
);

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Any navigation closes every menu.
  useEffect(() => {
    setOpenMenu(null);
    setMobileOpen(false);
  }, [location.pathname, location.hash]);

  // Navigate to a homepage in-page section (e.g. #join) from any route.
  const goToSection = (id: string) => {
    setMobileOpen(false);
    if (location.pathname !== '/') {
      navigate(`/#${id}`);
      return;
    }
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const iconClass =
    'text-ink-faint hover:text-ink hover:scale-110 hover:drop-shadow-[0_0_6px_rgba(255,255,255,0.5)] transition-all duration-300 ease-out';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-canvas/70 backdrop-blur-md border-b border-line/10">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-2.5 whitespace-nowrap group">
            <img src="/RL-Logo.png" alt="" className="h-8 w-auto shrink-0 drop-shadow-[0_0_8px_rgba(255,255,255,0.15)]" />
            <span className="font-display text-sm tracking-[0.2em] text-ink font-light group-hover:text-ink-soft transition-colors">
              {site.name || 'ROCKET LAUNCHERS'}
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-8">
            <Link
              to="/"
              className="text-[13px] tracking-[0.18em] text-ink-muted hover:text-ink hover:[text-shadow:0_0_10px_rgba(255,255,255,0.45)] transition-all duration-300 font-light"
            >
              HOME
            </Link>

            {MENUS.map((menu) => {
              const open = openMenu === menu.label;
              const active = menu.items.some((i) => i.to === location.pathname);
              return (
                <div
                  key={menu.label}
                  className="relative"
                  onMouseEnter={() => setOpenMenu(menu.label)}
                  onMouseLeave={() => setOpenMenu((m) => (m === menu.label ? null : m))}
                >
                  <button
                    type="button"
                    aria-haspopup="true"
                    aria-expanded={open}
                    onClick={() => setOpenMenu(open ? null : menu.label)}
                    className={`flex items-center gap-1.5 text-[13px] tracking-[0.18em] font-light transition-all duration-300 hover:text-ink ${
                      open || active ? 'text-ink' : 'text-ink-muted'
                    }`}
                  >
                    {menu.label}
                    <Chevron open={open} />
                  </button>

                  <div className={`absolute left-0 top-full pt-3 ${open ? '' : 'pointer-events-none'}`}>
                    <div
                      className={`min-w-[210px] bg-canvas/90 backdrop-blur-md border border-line/10 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.85)] py-2 origin-top transition-all duration-200 ease-out ${
                        open ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-1 scale-[0.98]'
                      }`}
                    >
                      {menu.items.map((item) => (
                        <Link
                          key={item.to}
                          to={item.to}
                          className={`block px-5 py-2.5 text-[13px] tracking-[0.1em] font-light transition-colors hover:bg-surface-2 hover:text-ink ${
                            item.to === location.pathname ? 'text-ink' : 'text-ink-muted'
                          }`}
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}

            <button
              onClick={() => goToSection('join')}
              className="text-[13px] tracking-[0.18em] text-accent/90 hover:text-ink hover:scale-105 transition-all duration-300 ease-out font-light"
            >
              JOIN
            </button>
          </nav>

          {/* Right cluster: socials + mobile toggle */}
          <div className="flex items-center gap-5">
            {site.links.instagram && (
              <a href={site.links.instagram} target="_blank" rel="noopener noreferrer" className={`${iconClass} hidden sm:inline-flex`} aria-label="Instagram">
                <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              </a>
            )}
            {site.links.github && (
              <a href={site.links.github} target="_blank" rel="noopener noreferrer" className={`${iconClass} hidden sm:inline-flex`} aria-label="GitHub">
                <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </a>
            )}
            {site.links.email && (
              <a href={`mailto:${site.links.email}`} className={`${iconClass} hidden sm:inline-flex`} aria-label="Email">
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </a>
            )}

            {/* Mobile hamburger */}
            <button
              type="button"
              aria-label="Menu"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
              className="lg:hidden text-ink-soft hover:text-ink transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18 18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu panel */}
        <div
          className={`lg:hidden overflow-hidden transition-all duration-300 ease-out ${
            mobileOpen ? 'max-h-[640px] opacity-100 mt-4' : 'max-h-0 opacity-0'
          }`}
        >
          <nav className="border-t border-line/10 pt-4 pb-2 space-y-5">
            <Link to="/" className="block text-sm tracking-[0.16em] text-ink font-light">
              HOME
            </Link>
            {MENUS.map((menu) => (
              <div key={menu.label}>
                <div className="text-[11px] tracking-[0.2em] text-ink-faint uppercase font-light mb-2">{menu.label}</div>
                <div className="space-y-1 pl-3 border-l border-line/10">
                  {menu.items.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`block py-1.5 text-sm tracking-[0.1em] font-light transition-colors hover:text-ink ${
                        item.to === location.pathname ? 'text-ink' : 'text-ink-muted'
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
            <button
              onClick={() => goToSection('join')}
              className="block text-sm tracking-[0.16em] text-accent/90 hover:text-ink transition-colors font-light"
            >
              JOIN
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
