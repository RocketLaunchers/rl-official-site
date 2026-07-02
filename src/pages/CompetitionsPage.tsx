import PageShell from '../components/PageShell';
import EventCard from '../components/EventCard';
import Icon from '../components/Icons';
import { competitions } from '../data/events';

export default function CompetitionsPage() {
  // Flatten every placement + award across all competitions for the highlights row.
  const honors = competitions.flatMap((e) => {
    const items: { key: string; label: string; event: string; when: string }[] = [];
    const when = e.displayDate || e.date || '';
    if (e.placement) items.push({ key: `${e.id}-placement`, label: e.placement, event: e.title, when });
    e.awards.forEach((a, i) =>
      items.push({ key: `${e.id}-award-${i}`, label: a, event: e.title, when }),
    );
    return items;
  });

  return (
    <PageShell
      title="Competitions"
      intro="Where the official roster takes our rockets to the line. Every competition the team has flown — the dates, the venues, what we brought, and how we placed."
    >
      {competitions.length === 0 ? (
        <p className="text-ink-faint font-light">No competitions recorded yet.</p>
      ) : (
        <>
          {honors.length > 0 && (
            <section className="mb-16">
              <h2 className="flex items-center gap-2.5 text-ink-soft text-[11px] uppercase tracking-[0.2em] font-light mb-6">
                <Icon name="trophy" className="w-4 h-4 text-accent/80" />
                Awards &amp; Achievements
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {honors.map((h) => (
                  <div
                    key={h.key}
                    className="border border-accent/20 bg-accent/[0.03] p-5 flex items-start gap-3.5"
                  >
                    <Icon name="trophy" className="w-7 h-7 text-accent/80 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-ink text-base font-light leading-snug">{h.label}</p>
                      <p className="text-ink-faint text-xs font-light mt-1.5">
                        {[h.event, h.when].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-10">
            {competitions.map((e) => (
              <EventCard key={e.id} event={e} showAwards={false} wide />
            ))}
          </section>
        </>
      )}
    </PageShell>
  );
}
