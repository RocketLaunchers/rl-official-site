import { Link } from 'react-router-dom';
import Icon from './Icons';
import SectionHeading from './SectionHeading';
import { currentSeason } from '../data/seasons';
import { subteamsForSeason } from '../data/org';

/** Homepage grid of the current season's active subteams. */
const SubteamsStrip = () => {
  const season = currentSeason;
  if (!season) return null;
  const subteams = subteamsForSeason(season.id);
  if (subteams.length === 0) return null;

  return (
    <section id="subteams" className="py-24">
      <div className="max-w-7xl mx-auto px-6">
        <SectionHeading title="SUBTEAMS" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {subteams.map((st) => (
            <Link
              key={st.id}
              to={`/subteams/${st.id}`}
              className="group border border-white/10 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.035] transition-all duration-300 p-6 flex flex-col"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-white/5 border border-white/10 p-2.5 text-white">
                  <Icon name={st.icon} />
                </div>
                <h3 className="font-display text-lg font-light text-white tracking-tight group-hover:text-neutral-300 transition-colors">
                  {st.name}
                </h3>
              </div>
              <p className="text-neutral-400 text-sm font-light leading-relaxed flex-1">
                {st.shortDescription}
              </p>
              {st.createdSeason === season.id && (
                <span className="mt-4 self-start text-[10px] uppercase tracking-[0.15em] text-cyan-300/80 border border-cyan-400/30 px-2 py-0.5">
                  New this season
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SubteamsStrip;
