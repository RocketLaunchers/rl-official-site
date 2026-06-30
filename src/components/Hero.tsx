import { useNavigate } from 'react-router-dom';
import { site } from '../data/site';
import { currentSeason } from '../data/seasons';

const Hero = () => {
  const navigate = useNavigate();

  // A CTA target starting with "/" is a route; otherwise it's a homepage section.
  const onCta = (target: string) => {
    if (target.startsWith('/')) navigate(target);
    else document.getElementById(target)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="hero" className="min-h-screen flex items-center justify-center pt-20">
      <div className="max-w-6xl mx-auto px-6 w-full">
        <div className="flex flex-col items-center text-center">
          <img
            src="/RL-Logo.png"
            alt={`${site.name} logo`}
            className="w-44 sm:w-56 md:w-72 h-auto mb-8 drop-shadow-[0_0_40px_rgba(255,255,255,0.2)]"
          />

          <p className="text-base md:text-xl tracking-[0.3em] text-neutral-300 font-light uppercase mb-6">
            {site.name}
          </p>

          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-light text-white leading-[0.95] tracking-tight mb-7">
            {site.headlines.map((headline, index) => (
              <span key={index} className="block">{headline}</span>
            ))}
          </h1>

          <p className="text-neutral-500 text-sm md:text-base font-light tracking-wide mb-4 max-w-2xl">
            {site.tagline}
          </p>

          {currentSeason && (
            <p className="text-cyan-300/80 text-[11px] md:text-xs uppercase tracking-[0.25em] font-light mb-12">
              {currentSeason.name}
              {currentSeason.theme ? ` — ${currentSeason.theme}` : ''}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3">
            {site.ctas.map((cta, index) => (
              <button
                key={index}
                onClick={() => onCta(cta.target)}
                className={
                  index === 0
                    ? 'bg-white text-black px-8 py-3.5 text-[13px] tracking-[0.12em] font-medium hover:bg-neutral-200 hover:shadow-[0_0_22px_rgba(255,255,255,0.28)] transition-all duration-300 ease-out'
                    : 'border border-white/20 text-white px-8 py-3.5 text-[13px] tracking-[0.12em] font-light hover:border-white/50 hover:bg-white/5 hover:shadow-[0_0_18px_rgba(255,255,255,0.12)] transition-all duration-300 ease-out'
                }
              >
                {cta.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
