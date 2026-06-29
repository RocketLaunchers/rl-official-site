import PageShell from '../components/PageShell';
import PersonCard from '../components/PersonCard';
import { alumni, pastRolesForPerson } from '../data/org';

/** Group alumni by graduation year (newest first). */
function byGradYear(people: typeof alumni) {
  const groups = new Map<string, typeof alumni>();
  for (const p of people) {
    const key = p.gradYear ? String(p.gradYear) : 'Other';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }
  return [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

export default function AlumniPage() {
  const groups = byGradYear(alumni);

  return (
    <PageShell
      title="Alumni"
      intro="Where our members go after Rocket Launchers. Their old season roles stay part of the team's history."
    >
      {alumni.length === 0 ? (
        <p className="text-neutral-500 font-light">No alumni recorded yet.</p>
      ) : (
        groups.map(([year, people]) => (
          <section key={year} className="mb-14">
            <h2 className="text-neutral-500 text-[11px] uppercase tracking-[0.2em] font-light mb-6">
              Class of {year}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {people.map((p) => {
                const past = pastRolesForPerson(p.id)[0];
                const role = past ? `${past.role.name}, ${past.season.name}` : undefined;
                const company = p.privacy.showCompany && p.company ? `Now at ${p.company}` : undefined;
                return <PersonCard key={p.id} person={p} subtitle={role} meta={company} />;
              })}
            </div>
          </section>
        ))
      )}
    </PageShell>
  );
}
