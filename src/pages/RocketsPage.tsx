import { Link } from 'react-router-dom';
import PageShell from '../components/PageShell';
import ProjectGallery from '../components/ProjectGallery';
import { rockets } from '../data/rockets';
import { seasonById } from '../data/seasons';
import { rocketMedia, rocketStatusColor } from '../lib/rocket';
import { useProgressiveReveal } from '../lib/useProgressiveReveal';

/** Archive of every rocket the team has built. */
export default function RocketsPage() {
  // Each tile is a 3D model (its own WebGL context). Mount them one at a time —
  // after the page transition — so they don't all spin up in a single frame.
  const ready = useProgressiveReveal(rockets.length);

  return (
    <PageShell
      title="Rockets"
      intro="Every rocket the team has designed and built. Each one is a permanent entry in our engineering history."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {rockets.map((rocket, i) => {
          const season = rocket.seasons[0] ? seasonById(rocket.seasons[0]) : undefined;
          return (
            <Link
              key={rocket.id}
              to={`/rockets/${rocket.id}`}
              className="group border border-line/10 bg-surface hover:border-line/25 hover:bg-surface-2 transition-all duration-300"
            >
              <div className="aspect-video bg-well overflow-hidden border-b border-line/10">
                {i < ready ? (
                  <div className="w-full h-full tile-in">
                    <ProjectGallery items={rocketMedia(rocket)} title={rocket.name} />
                  </div>
                ) : (
                  <div className="w-full h-full grid place-items-center bg-well">
                    <span className="text-ink-faint text-xs tracking-[0.15em] uppercase">3D model</span>
                  </div>
                )}
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display text-xl font-light text-ink tracking-tight group-hover:text-ink-soft transition-colors">
                    {rocket.name}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 ${rocketStatusColor(rocket.status)}`} />
                    <span className="text-[11px] uppercase tracking-[0.15em] text-ink-muted font-light">
                      {rocket.status}
                    </span>
                  </div>
                </div>
                <p className="text-ink-faint text-xs font-light tracking-wide mb-4">
                  {[season?.name, rocket.competition].filter(Boolean).join(' · ')}
                </p>
                <p className="text-ink-muted text-sm font-light leading-relaxed line-clamp-3">{rocket.mission}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </PageShell>
  );
}
