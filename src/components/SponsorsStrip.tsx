import SectionHeading from './SectionHeading';
import { currentSeason } from '../data/seasons';
import { sponsorsByTier } from '../data/org';

/** Homepage sponsors strip for the current season, grouped by tier. */
const SponsorsStrip = () => {
  if (!currentSeason) return null;
  const groups = sponsorsByTier(currentSeason.id).filter((g) =>
    g.sponsors.some((s) => s.entry.showOnHomepage),
  );
  if (groups.length === 0) return null;

  return (
    <section id="sponsors" className="py-24">
      <div className="max-w-7xl mx-auto px-6">
        <SectionHeading title="SPONSORS" to="/sponsors" linkLabel="All sponsors" />

        <div className="space-y-10">
          {groups.map((group) => {
            const visible = group.sponsors.filter((s) => s.entry.showOnHomepage);
            if (visible.length === 0) return null;
            return (
              <div key={group.tier}>
                <h3 className="text-ink-faint text-[11px] uppercase tracking-[0.2em] font-light mb-4">
                  {group.tier}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {visible.map(({ sponsor }) => (
                    <a
                      key={sponsor.id}
                      href={sponsor.website || undefined}
                      target={sponsor.website ? '_blank' : undefined}
                      rel="noopener noreferrer"
                      className="group border border-line/10 bg-surface hover:border-line/25 hover:bg-surface transition-all duration-300 aspect-[3/2] flex items-center justify-center p-5"
                    >
                      {sponsor.logo ? (
                        <img src={sponsor.logo} alt={sponsor.name} className="max-h-full max-w-full object-contain opacity-80 group-hover:opacity-100 transition-opacity" />
                      ) : (
                        <span className="text-ink-soft text-sm font-light text-center group-hover:text-ink transition-colors">
                          {sponsor.name}
                        </span>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default SponsorsStrip;
