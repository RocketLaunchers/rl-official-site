import { useParams, Link } from 'react-router-dom';
import PageShell from '../components/PageShell';
import ProjectGallery from '../components/ProjectGallery';
import { rocketById } from '../data/rockets';
import { seasonById } from '../data/seasons';
import { personById } from '../data/people';
import { subteamById } from '../data/subteams';
import { rocketMedia, rocketSpecRows } from '../lib/rocket';
import CustomFields from '../components/CustomFields';
import { usableCustomFields } from '../lib/customFields';

export default function RocketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const rocket = id ? rocketById(id) : undefined;

  if (!rocket) {
    return (
      <PageShell title="Rocket not found" backTo="/rockets" backLabel="All rockets">
        <p className="text-ink-muted font-light">
          That rocket doesn’t exist. <Link to="/rockets" className="text-ink underline">Browse all rockets</Link>.
        </p>
      </PageShell>
    );
  }

  const specs = rocketSpecRows(rocket);
  const seasons = rocket.seasons.map(seasonById).filter(Boolean);
  const subteams = rocket.relatedSubteams.map(subteamById).filter(Boolean);
  const credits = rocket.credits.map(personById).filter(Boolean);

  return (
    <PageShell
      title={rocket.name}
      intro={rocket.mission}
      backTo="/rockets"
      backLabel="All rockets"
    >
      <div className="flex flex-wrap items-center gap-3 -mt-6 mb-10 text-sm">
        <span className="text-[11px] uppercase tracking-[0.15em] text-accent/80 border border-accent/30 px-2 py-0.5">
          {rocket.status}
        </span>
        {seasons.map((s) => (
          <span key={s!.id} className="text-ink-faint font-light">{s!.name}</span>
        ))}
        {rocket.competition && <span className="text-ink-faint font-light">· {rocket.competition}</span>}
      </div>

      <div className="aspect-video bg-well border border-line/10 overflow-hidden mb-10">
        <ProjectGallery items={rocketMedia(rocket)} title={rocket.name} />
      </div>

      {specs.length > 0 && (
        <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-14">
          {specs.map((s) => (
            <div key={s.label} className="bg-surface border border-line/10 p-4">
              <dt className="text-ink-faint text-[10px] uppercase tracking-[0.15em] font-light">{s.label}</dt>
              <dd className="text-ink text-sm font-light mt-1">{s.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {rocket.subsystems.length > 0 && (
        <section className="mb-14">
          <h2 className="font-display text-2xl font-light text-ink tracking-tight mb-6">Subsystems</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rocket.subsystems.map((sub) => (
              <div key={sub.name} className="bg-surface border border-line/10 p-5">
                <h3 className="text-ink font-light text-[15px] mb-1.5">{sub.name}</h3>
                <p className="text-ink-muted text-sm font-light leading-relaxed">{sub.summary}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {(rocket.results || rocket.lessonsLearned) && (
        <section className="mb-14 grid grid-cols-1 md:grid-cols-2 gap-8">
          {rocket.results && (
            <div>
              <h2 className="font-display text-2xl font-light text-ink tracking-tight mb-4">Results</h2>
              <p className="text-ink-soft font-light leading-relaxed">{rocket.results}</p>
            </div>
          )}
          {rocket.lessonsLearned && (
            <div>
              <h2 className="font-display text-2xl font-light text-ink tracking-tight mb-4">Lessons Learned</h2>
              <p className="text-ink-soft font-light leading-relaxed">{rocket.lessonsLearned}</p>
            </div>
          )}
        </section>
      )}

      {subteams.length > 0 && (
        <section className="mb-14">
          <h2 className="font-display text-2xl font-light text-ink tracking-tight mb-6">Subteams Involved</h2>
          <div className="flex flex-wrap gap-3">
            {subteams.map((st) => (
              <Link
                key={st!.id}
                to={`/subteams/${st!.id}`}
                className="border border-line/10 text-ink-soft hover:text-ink hover:border-line/30 text-sm tracking-wide px-4 py-2 font-light transition-colors"
              >
                {st!.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {credits.length > 0 && (
        <section>
          <h2 className="font-display text-2xl font-light text-ink tracking-tight mb-6">Team Credits</h2>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {credits.map((p) => (
              <span key={p!.id} className="text-ink-soft font-light text-sm">{p!.name}</span>
            ))}
          </div>
        </section>
      )}

      {usableCustomFields(rocket.customFields).length > 0 && (
        <section className="mt-14">
          <h2 className="font-display text-2xl font-light text-ink tracking-tight mb-6">Additional Info</h2>
          <CustomFields fields={rocket.customFields} className="border-t border-line/10 divide-y divide-line/10 max-w-2xl" />
        </section>
      )}
    </PageShell>
  );
}
