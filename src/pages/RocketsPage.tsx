import { Link } from 'react-router-dom';
import PageShell from '../components/PageShell';
import ProjectGallery from '../components/ProjectGallery';
import { rockets } from '../data/rockets';
import { seasonById } from '../data/seasons';
import { rocketMedia, rocketStatusColor } from '../lib/rocket';

/** Archive of every rocket the team has built. */
export default function RocketsPage() {
  return (
    <PageShell
      title="Rockets"
      intro="Every rocket the team has designed and built. Each one is a permanent entry in our engineering history."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {rockets.map((rocket) => {
          const season = rocket.seasons[0] ? seasonById(rocket.seasons[0]) : undefined;
          return (
            <Link
              key={rocket.id}
              to={`/rockets/${rocket.id}`}
              className="group border border-white/10 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.035] transition-all duration-300"
            >
              <div className="aspect-video bg-neutral-950 overflow-hidden border-b border-white/10">
                <ProjectGallery items={rocketMedia(rocket)} title={rocket.name} />
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display text-xl font-light text-white tracking-tight group-hover:text-neutral-300 transition-colors">
                    {rocket.name}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 ${rocketStatusColor(rocket.status)}`} />
                    <span className="text-[11px] uppercase tracking-[0.15em] text-neutral-400 font-light">
                      {rocket.status}
                    </span>
                  </div>
                </div>
                <p className="text-neutral-500 text-xs font-light tracking-wide mb-4">
                  {[season?.name, rocket.competition].filter(Boolean).join(' · ')}
                </p>
                <p className="text-neutral-400 text-sm font-light leading-relaxed line-clamp-3">{rocket.mission}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </PageShell>
  );
}
