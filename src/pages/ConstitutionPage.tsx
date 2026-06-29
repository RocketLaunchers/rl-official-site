import PageShell from '../components/PageShell';
import BlockRenderer from '../components/BlockRenderer';
import { constitutions, currentConstitution } from '../data/constitution';
import { seasonById } from '../data/seasons';

export default function ConstitutionPage() {
  const current = currentConstitution;
  const history = constitutions.filter((c) => c.id !== current?.id);

  return (
    <PageShell
      title="Constitution"
      intro="Our governing document is version-controlled. When roles, subteams, or election rules change, future members can see exactly what changed and when."
    >
      {!current ? (
        <p className="text-neutral-500 font-light">No constitution has been published yet.</p>
      ) : (
        <>
          <section className="mb-16">
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <h2 className="font-display text-2xl font-light text-white tracking-tight">
                Current — Version {current.version}
              </h2>
              <span className="text-[11px] uppercase tracking-[0.15em] text-cyan-300/80 border border-cyan-400/30 px-2 py-0.5">
                {seasonById(current.effectiveSeason)?.name ?? current.effectiveSeason}
              </span>
            </div>
            <p className="text-neutral-500 text-sm font-light mb-6">
              {current.displayDate ? `Approved ${current.displayDate}` : ''}
              {current.approvedBy ? ` · ${current.approvedBy}` : ''}
            </p>

            {current.pdf && (
              <a
                href={current.pdf}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border border-white/20 text-white px-6 py-3 text-[13px] tracking-[0.12em] font-light hover:border-white/50 hover:bg-white/5 transition-all duration-300 mb-10"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download PDF
              </a>
            )}

            {current.summaryOfChanges.length > 0 && (
              <div className="bg-white/[0.02] border border-white/10 p-6 mb-10">
                <h3 className="text-white text-[11px] uppercase tracking-[0.18em] font-light mb-3">
                  Summary of Changes
                </h3>
                <ul className="space-y-1.5">
                  {current.summaryOfChanges.map((c, i) => (
                    <li key={i} className="text-neutral-400 font-light text-sm flex gap-2">
                      <span className="text-cyan-300/60">—</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {current.body.length > 0 && (
              <article className="prose prose-invert max-w-none">
                <BlockRenderer blocks={current.body} />
              </article>
            )}
          </section>

          {history.length > 0 && (
            <section>
              <h2 className="text-neutral-500 text-[11px] uppercase tracking-[0.2em] font-light mb-6">
                Revision History
              </h2>
              <div className="space-y-3">
                {history.map((c) => (
                  <div key={c.id} className="border border-white/10 bg-white/[0.02] p-5 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="text-white font-light">Version {c.version}</span>
                    <span className="text-neutral-500 text-sm font-light">
                      {seasonById(c.effectiveSeason)?.name ?? c.effectiveSeason}
                    </span>
                    {c.displayDate && <span className="text-neutral-600 text-sm font-light">· {c.displayDate}</span>}
                    <span className="text-neutral-600 text-[11px] uppercase tracking-wide ml-auto">{c.status}</span>
                    {c.pdf && (
                      <a href={c.pdf} target="_blank" rel="noopener noreferrer" className="text-neutral-400 hover:text-white text-sm font-light transition-colors">
                        PDF →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </PageShell>
  );
}
