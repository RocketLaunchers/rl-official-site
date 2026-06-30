import { useParams, Link } from 'react-router-dom';
import PageShell from '../components/PageShell';
import ProjectGallery from '../components/ProjectGallery';
import { subteamById } from '../data/subteams';
import { seasons, seasonById } from '../data/seasons';
import { personById } from '../data/people';
import { roleById } from '../data/roles';
import { rocketById } from '../data/rockets';

/** Find who led this subteam each season (newest first). */
function leadHistory(subteamId: string) {
  const out: { seasonName: string; personName: string; roleName: string }[] = [];
  for (const season of seasons) {
    for (const entry of season.roster) {
      if (entry.subteam !== subteamId) continue;
      const role = roleById(entry.role);
      const person = personById(entry.person);
      if (!role || !person || !role.isSubteamRole) continue;
      out.push({ seasonName: season.name, personName: person.name, roleName: role.name });
    }
  }
  return out;
}

export default function SubteamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const subteam = id ? subteamById(id) : undefined;

  if (!subteam) {
    return (
      <PageShell title="Subteam not found" backTo="/team" backLabel="The team">
        <p className="text-ink-muted font-light">That subteam doesn’t exist.</p>
      </PageShell>
    );
  }

  const leads = leadHistory(subteam.id);
  const currentLead = leads[0];
  const pastLeads = leads.slice(1);
  const rockets = subteam.relatedRockets.map(rocketById).filter(Boolean);
  const created = subteam.createdSeason ? seasonById(subteam.createdSeason) : undefined;

  return (
    <PageShell
      title={subteam.name}
      intro={subteam.longDescription || subteam.shortDescription}
      backTo="/team"
      backLabel="The team"
    >
      <div className="flex flex-wrap items-center gap-3 -mt-6 mb-12 text-sm">
        <span className="text-[11px] uppercase tracking-[0.15em] text-accent/80 border border-accent/30 px-2 py-0.5">
          {subteam.status}
        </span>
        {created && <span className="text-ink-faint font-light">Created {created.name}</span>}
        {currentLead && <span className="text-ink-faint font-light">· Lead: {currentLead.personName}</span>}
      </div>

      {subteam.media.length > 0 && (
        <div className="aspect-video bg-well border border-line/10 overflow-hidden mb-12">
          <ProjectGallery items={subteam.media} title={subteam.name} />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-14">
        {subteam.skills.length > 0 && (
          <div className="bg-surface border border-line/10 p-6">
            <h3 className="text-ink text-sm uppercase tracking-[0.18em] font-light mb-4">Skills</h3>
            <div className="flex flex-wrap gap-2.5">
              {subteam.skills.map((s) => (
                <span key={s} className="border border-line/15 text-ink text-sm md:text-base tracking-wide px-4 py-2 font-light">{s}</span>
              ))}
            </div>
          </div>
        )}
        {subteam.tools.length > 0 && (
          <div className="bg-surface border border-line/10 p-6">
            <h3 className="text-ink text-sm uppercase tracking-[0.18em] font-light mb-4">Tools</h3>
            <div className="flex flex-wrap gap-2.5">
              {subteam.tools.map((t) => (
                <span key={t} className="border border-line/15 text-ink text-sm md:text-base tracking-wide px-4 py-2 font-light">{t}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {rockets.length > 0 && (
        <section className="mb-14">
          <h2 className="font-display text-2xl font-light text-ink tracking-tight mb-6">Rockets</h2>
          <div className="flex flex-wrap gap-3">
            {rockets.map((r) => (
              <Link
                key={r!.id}
                to={`/rockets/${r!.id}`}
                className="border border-line/10 text-ink-soft hover:text-ink hover:border-line/30 text-sm tracking-wide px-4 py-2 font-light transition-colors"
              >
                {r!.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {pastLeads.length > 0 && (
        <section>
          <h2 className="font-display text-2xl font-light text-ink tracking-tight mb-6">Past Leads</h2>
          <ul className="space-y-2">
            {pastLeads.map((l, i) => (
              <li key={i} className="text-ink-muted font-light text-sm">
                <span className="text-ink">{l.personName}</span> — {l.roleName}, {l.seasonName}
              </li>
            ))}
          </ul>
        </section>
      )}
    </PageShell>
  );
}
