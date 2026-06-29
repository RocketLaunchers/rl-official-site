import { useState } from 'react';
import PageShell from '../components/PageShell';
import PersonCard from '../components/PersonCard';
import { seasons, currentSeason } from '../data/seasons';
import { groupedRoster, advisorsForSeason, type RosterMember } from '../data/org';

function Group({ title, members }: { title: string; members: RosterMember[] }) {
  if (members.length === 0) return null;
  return (
    <section className="mb-14">
      <h2 className="text-neutral-500 text-[11px] uppercase tracking-[0.2em] font-light mb-6">{title}</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {members.map((m) => (
          <PersonCard
            key={`${m.entry.person}-${m.entry.role}`}
            person={m.person}
            subtitle={m.role.name}
            meta={m.subteam ? m.subteam.name : undefined}
          />
        ))}
      </div>
    </section>
  );
}

export default function TeamPage() {
  const [seasonId, setSeasonId] = useState<string>(currentSeason?.id ?? seasons[0]?.id ?? '');
  const { officers, leads, members } = groupedRoster(seasonId);
  const advisors = advisorsForSeason(seasonId);
  const empty = officers.length + leads.length + members.length + advisors.length === 0;

  return (
    <PageShell
      title="The Team"
      intro="Our roster changes every season, but the history stays. Switch seasons to see who led the team each year."
    >
      {/* Season switcher */}
      <div className="flex flex-wrap gap-2 mb-12">
        {seasons.map((s) => (
          <button
            key={s.id}
            onClick={() => setSeasonId(s.id)}
            className={`px-4 py-2 text-[13px] tracking-[0.1em] font-light border transition-all duration-200 ${
              s.id === seasonId
                ? 'bg-white text-black border-white'
                : 'border-white/15 text-neutral-300 hover:border-white/40 hover:text-white'
            }`}
          >
            {s.name}
            {s.status === 'current' && s.id !== seasonId && (
              <span className="ml-2 text-cyan-300/80 text-[10px] uppercase">Current</span>
            )}
          </button>
        ))}
      </div>

      {empty ? (
        <p className="text-neutral-500 font-light">No roster has been assigned for this season yet.</p>
      ) : (
        <>
          <Group title="Officers" members={officers} />
          <Group title="Subteam Leads" members={leads} />
          <Group title="Members" members={members} />

          {advisors.length > 0 && (
            <section>
              <h2 className="text-neutral-500 text-[11px] uppercase tracking-[0.2em] font-light mb-6">
                Advisors &amp; Mentors
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {advisors.map((a) => (
                  <PersonCard
                    key={a.entry.person}
                    person={a.person}
                    subtitle={a.entry.category}
                    meta={a.entry.supportRole || undefined}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </PageShell>
  );
}
