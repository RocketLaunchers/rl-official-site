import PersonCard from './PersonCard';
import SectionHeading from './SectionHeading';
import { currentSeason } from '../data/seasons';
import { groupedRoster, roleTitle } from '../data/org';

/** Homepage preview of the current season's leadership (officers + subteam leads). */
const TeamStrip = () => {
  if (!currentSeason) return null;
  const { officers, leads } = groupedRoster(currentSeason.id);
  const featured = [...officers, ...leads];
  if (featured.length === 0) return null;

  return (
    <section id="team" className="py-24">
      <div className="max-w-7xl mx-auto px-6">
        <SectionHeading title="THE TEAM" to="/team" linkLabel="Full roster" />

        <p className="text-ink-muted font-light leading-relaxed text-[15px] max-w-3xl mb-12">
          Meet the {currentSeason.name} leadership. Every rocket we fly is designed and built by
          students across our subteams.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {featured.map((m) => (
            <PersonCard
              key={`${m.entry.person}-${m.entry.role}`}
              person={m.person}
              subtitle={roleTitle(m.role, m.subteam)}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default TeamStrip;
