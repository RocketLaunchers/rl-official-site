import { site } from '../data/site';

const Hero = () => {
  return (
    <section id="hero" className="min-h-screen flex items-center justify-center pt-20">
      <div className="max-w-6xl mx-auto px-6 w-full">
        <div className="flex flex-col items-center text-center">
          <p className="text-xs md:text-sm tracking-[0.35em] text-neutral-400 font-light uppercase mb-6">
            {site.name}
          </p>

          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-light text-white leading-[0.95] tracking-tight mb-7">
            {site.headlines.map((headline, index) => (
              <span key={index} className="block">{headline}</span>
            ))}
          </h1>

          <p className="text-neutral-500 text-sm md:text-base font-light tracking-wide mb-12">
            {site.role}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {site.ctas.map((cta, index) => (
              <button
                key={index}
                onClick={() => document.getElementById(cta.target)?.scrollIntoView({ behavior: 'smooth' })}
                className={
                  index === 0
                    ? 'bg-white text-black px-8 py-3.5 text-[13px] tracking-[0.12em] font-medium hover:bg-neutral-200 transition-colors'
                    : 'border border-white/20 text-white px-8 py-3.5 text-[13px] tracking-[0.12em] font-light hover:border-white/50 hover:bg-white/5 transition-colors'
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
