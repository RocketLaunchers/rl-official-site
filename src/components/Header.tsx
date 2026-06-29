import { Link, useLocation, useNavigate } from 'react-router-dom';
import { site } from '../data/site';

const NAV: { label: string; to: string }[] = [
  { label: 'HOME', to: '/' },
  { label: 'TEAM', to: '/team' },
  { label: 'ROCKETS', to: '/rockets' },
  { label: 'SPONSORS', to: '/sponsors' },
  { label: 'ALUMNI', to: '/alumni' },
  { label: 'CONSTITUTION', to: '/constitution' },
];

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Navigate to a homepage in-page section (e.g. #join) from any route.
  const goToSection = (id: string) => {
    if (location.pathname !== '/') {
      navigate(`/#${id}`);
      return;
    }
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const iconClass =
    'text-neutral-500 hover:text-white hover:scale-110 hover:drop-shadow-[0_0_6px_rgba(255,255,255,0.5)] transition-all duration-300 ease-out';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/70 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between gap-6">
          <Link
            to="/"
            className="flex items-center gap-2.5 whitespace-nowrap group"
          >
            <img src="/RL-Logo.png" alt="" className="h-8 w-auto shrink-0 drop-shadow-[0_0_8px_rgba(255,255,255,0.15)]" />
            <span className="font-display text-sm tracking-[0.2em] text-white font-light group-hover:text-neutral-300 transition-colors">
              {site.name || 'ROCKET LAUNCHERS'}
            </span>
          </Link>

          <nav className="hidden md:flex space-x-7">
            {NAV.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                className="inline-block text-[13px] tracking-[0.18em] text-neutral-400 hover:text-white hover:scale-105 hover:[text-shadow:0_0_10px_rgba(255,255,255,0.45)] transition-all duration-300 ease-out font-light"
              >
                {item.label}
              </Link>
            ))}
            <button
              onClick={() => goToSection('join')}
              className="inline-block text-[13px] tracking-[0.18em] text-cyan-300/90 hover:text-white hover:scale-105 transition-all duration-300 ease-out font-light"
            >
              JOIN
            </button>
          </nav>

          <div className="flex items-center space-x-5">
            {site.links.instagram && (
              <a href={site.links.instagram} target="_blank" rel="noopener noreferrer" className={iconClass} aria-label="Instagram">
                <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              </a>
            )}
            {site.links.github && (
              <a href={site.links.github} target="_blank" rel="noopener noreferrer" className={iconClass} aria-label="GitHub">
                <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </a>
            )}
            {site.links.email && (
              <a href={`mailto:${site.links.email}`} className={iconClass} aria-label="Email">
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </a>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
