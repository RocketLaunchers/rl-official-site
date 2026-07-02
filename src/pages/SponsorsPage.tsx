import PageShell from '../components/PageShell';
import { seasons, currentSeason } from '../data/seasons';
import { sponsorById } from '../data/sponsors';
import { sponsorsByTier } from '../data/org';
import CustomFields from '../components/CustomFields';
import { usableCustomFields } from '../lib/customFields';

export default function SponsorsPage() {
  const groups = currentSeason ? sponsorsByTier(currentSeason.id) : [];

  // Past supporters: sponsors from earlier seasons not on the current roster.
  const currentIds = new Set(currentSeason?.sponsors.map((s) => s.sponsor) ?? []);
  const pastIds = new Set<string>();
  for (const season of seasons) {
    if (season.id === currentSeason?.id) continue;
    for (const s of season.sponsors) if (!currentIds.has(s.sponsor)) pastIds.add(s.sponsor);
  }
  const pastSponsors = [...pastIds].map(sponsorById).filter(Boolean);

  return (
    <PageShell
      title="Sponsors"
      intro="Our work is made possible by sponsors and partners who support the team with funding, materials, manufacturing, and mentorship."
    >
      {currentSeason && (
        <section className="mb-16">
          <h2 className="text-ink-faint text-[11px] uppercase tracking-[0.2em] font-light mb-8">
            {currentSeason.name} Sponsors
          </h2>
          {groups.length === 0 ? (
            <p className="text-ink-faint font-light">No sponsors recorded for this season yet.</p>
          ) : (
            <div className="space-y-12">
              {groups.map((group) => (
                <div key={group.tier}>
                  <h3 className="text-ink text-sm uppercase tracking-[0.18em] font-light mb-5">{group.tier}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {group.sponsors.map(({ sponsor, entry }) => {
                      const description = entry.publicDescription || sponsor.description;
                      const main = (
                        <>
                          <div className="h-16 flex items-center mb-4">
                            {sponsor.logo ? (
                              <img src={sponsor.logo} alt={sponsor.name} className="max-h-full max-w-[160px] object-contain opacity-80 group-hover:opacity-100 transition-opacity" />
                            ) : (
                              <h4 className="font-display text-lg font-light text-ink tracking-tight">{sponsor.name}</h4>
                            )}
                          </div>
                          {description && (
                            <p className="text-ink-muted text-sm font-light leading-relaxed">{description}</p>
                          )}
                        </>
                      );
                      // A card is one big link to the sponsor's site; custom-field
                      // links live below the link (nested anchors are invalid HTML).
                      return (
                        <div
                          key={sponsor.id}
                          className="group border border-line/10 bg-surface hover:border-line/25 hover:bg-surface-2 transition-all duration-300 p-6 flex flex-col"
                        >
                          {sponsor.website ? (
                            <a href={sponsor.website} target="_blank" rel="noopener noreferrer" className="block">
                              {main}
                            </a>
                          ) : (
                            main
                          )}
                          {entry.supportTypes.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              {entry.supportTypes.map((t) => (
                                <span key={t} className="border border-line/10 text-ink-faint text-[10px] uppercase tracking-wide px-2 py-0.5 font-light">{t}</span>
                              ))}
                            </div>
                          )}
                          {usableCustomFields(sponsor.customFields).length > 0 && (
                            <CustomFields fields={sponsor.customFields} className="mt-4 pt-4 border-t border-line/10 divide-y divide-line/10" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {pastSponsors.length > 0 && (
        <section>
          <h2 className="text-ink-faint text-[11px] uppercase tracking-[0.2em] font-light mb-8">Past Supporters</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {pastSponsors.map((s) => (
              <a
                key={s!.id}
                href={s!.website || undefined}
                target={s!.website ? '_blank' : undefined}
                rel="noopener noreferrer"
                className="border border-line/10 bg-surface hover:border-line/25 transition-all duration-300 aspect-[3/2] flex items-center justify-center p-5 text-center"
              >
                {s!.logo ? (
                  <img src={s!.logo} alt={s!.name} className="max-h-full max-w-full object-contain opacity-70" />
                ) : (
                  <span className="text-ink-soft text-sm font-light">{s!.name}</span>
                )}
              </a>
            ))}
          </div>
        </section>
      )}
    </PageShell>
  );
}
