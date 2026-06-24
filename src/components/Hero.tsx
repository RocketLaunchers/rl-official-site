import { site } from '../data/site';

const Hero = () => {
  return (
    <section id="hero" className="min-h-screen flex items-center justify-center pt-20">
      <div className="max-w-6xl mx-auto px-6 w-full">
        <div className="flex flex-col items-center text-center">
          <p className="text-base md:text-xl tracking-[0.3em] text-neutral-300 font-light uppercase mb-6">
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
