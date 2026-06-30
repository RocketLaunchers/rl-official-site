import PageShell from '../components/PageShell';
import EventCard from '../components/EventCard';
import { clubEvents } from '../data/events';

/** Things the club does together — launches, meetings, outreach, and socials. */
export default function EventsPage() {
  return (
    <PageShell
      title="Events"
      intro="Where the club shows up — test launches, general meetings, outreach, and socials. Come find us."
    >
      {clubEvents.length === 0 ? (
        <p className="text-ink-faint font-light">No events recorded yet.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {clubEvents.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
      )}
    </PageShell>
  );
}
