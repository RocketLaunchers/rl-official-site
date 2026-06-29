import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import SpaceBackground from './SpaceBackgroundLazy';
import Header from './Header';
import Footer from './Footer';

/**
 * Shared chrome for routed (non-homepage) pages: starfield background, header,
 * a constrained content column with a title/back link, and the footer.
 */
export default function PageShell({
  title,
  intro,
  backTo = '/',
  backLabel = 'Home',
  children,
}: {
  title: string;
  intro?: string;
  backTo?: string;
  backLabel?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black text-white relative">
      <SpaceBackground />
      <div className="relative z-10">
        <Header />
        <main className="pt-28 pb-20">
          <div className="max-w-7xl mx-auto px-6">
            <Link
              to={backTo}
              className="text-neutral-400 hover:text-white transition-colors font-light text-sm tracking-wide inline-flex items-center gap-2 mb-8"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>{backLabel}</span>
            </Link>

            <h1 className="font-display text-4xl lg:text-6xl font-light text-white leading-[1.05] tracking-tight mb-4">
              {title}
            </h1>
            {intro && <p className="text-neutral-400 font-light leading-relaxed max-w-3xl mb-12">{intro}</p>}
            {!intro && <div className="mb-12" />}

            {children}
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
