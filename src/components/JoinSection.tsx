import { about } from '../data/about';

/** Homepage join / get-involved call to action. */
const JoinSection = () => {
  const join = about.join;
  if (!join.title && !join.body) return null;

  return (
    <section id="join" className="py-24">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <h2 className="font-display text-3xl md:text-5xl font-light text-white tracking-tight mb-6">
          {join.title || 'Join the Team'}
        </h2>
        {join.body && (
          <p className="text-neutral-300 leading-relaxed font-light mb-10 max-w-2xl mx-auto">{join.body}</p>
        )}
        {join.ctaLabel && join.ctaHref && (
          <a
            href={join.ctaHref}
            className="group relative inline-flex items-center gap-3 px-12 py-4 border border-cyan-400/40 text-white text-sm tracking-[0.18em] uppercase font-light shadow-[0_0_25px_rgba(34,211,238,0.12)] transition-all duration-300 hover:border-cyan-400/80 hover:bg-cyan-400/[0.08] hover:shadow-[0_0_38px_rgba(34,211,238,0.28)]"
          >
            {join.ctaLabel}
            <svg className="w-5 h-5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </a>
        )}
      </div>
    </section>
  );
};

export default JoinSection;
