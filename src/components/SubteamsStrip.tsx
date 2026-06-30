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
              className="group border border-white/10 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.035] transition-all duration-300 flex flex-col overflow-hidden"
            >
              {/* Visual banner: a photo of what the subteam does, with an icon fallback. */}
              <div className="relative aspect-[16/9] overflow-hidden border-b border-white/10 bg-neutral-950">
                {st.image ? (
                  <img
                    src={st.image}
                    alt={st.name}
                    loading="lazy"
                    className="w-full h-full object-cover opacity-85 group-hover:opacity-100 group-hover:scale-[1.03] transition-all duration-500 ease-out"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/[0.06] to-transparent text-white/40 group-hover:text-white/60 transition-colors">
                    <Icon name={st.icon} className="w-14 h-14" />
                  </div>
                )}
                {st.createdSeason === season.id && (
                  <span className="absolute top-3 right-3 text-[10px] uppercase tracking-[0.15em] text-cyan-200 bg-black/60 backdrop-blur-sm border border-cyan-400/40 px-2 py-0.5">
                    New this season
                  </span>
                )}
              </div>

              <div className="p-6 flex flex-col flex-1">
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
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SubteamsStrip;
