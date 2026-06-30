import { Link } from 'react-router-dom';
import ProjectGallery from './ProjectGallery';
import SectionHeading from './SectionHeading';
import { rocketMedia, rocketSpecRows } from '../lib/rocket';
import { currentSeason } from '../data/seasons';
import { rocketById } from '../data/rockets';

/** Homepage feature for the current season's rocket. */
const RocketFeature = () => {
  const rocket = currentSeason?.currentRocket ? rocketById(currentSeason.currentRocket) : undefined;
  if (!rocket) return null;
  const specs = rocketSpecRows(rocket);

  return (
    <section id="rocket" className="py-24">
      <div className="max-w-7xl mx-auto px-6">
        <SectionHeading title="CURRENT ROCKET" to="/rockets" linkLabel="All rockets" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          <div className="aspect-video bg-well border border-line/10 overflow-hidden">
            <ProjectGallery items={rocketMedia(rocket)} title={rocket.name} />
          </div>

          <div>
            <div className="flex items-center gap-3 mb-3">
              <h3 className="font-display text-3xl font-light text-ink tracking-tight">{rocket.name}</h3>
              <span className="text-[11px] uppercase tracking-[0.15em] text-accent/80 border border-accent/30 px-2 py-0.5">
                {rocket.status}
              </span>
            </div>
            {rocket.competition && (
              <p className="text-ink-faint text-sm font-light tracking-wide mb-5">{rocket.competition}</p>
            )}
            <p className="text-ink-soft leading-relaxed font-light mb-7">{rocket.mission}</p>

            {specs.length > 0 && (
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
                {specs.map((s) => (
                  <div key={s.label} className="bg-surface border border-line/10 p-3">
                    <dt className="text-ink-faint text-[10px] uppercase tracking-[0.15em] font-light">{s.label}</dt>
                    <dd className="text-ink text-sm font-light mt-1">{s.value}</dd>
                  </div>
                ))}
              </dl>
            )}

            <Link
              to={`/rockets/${rocket.id}`}
              className="inline-block border border-line/20 text-ink px-7 py-3 text-[13px] tracking-[0.12em] font-light hover:border-line/50 hover:bg-surface-2 transition-all duration-300"
            >
              EXPLORE {rocket.name.toUpperCase()}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RocketFeature;
