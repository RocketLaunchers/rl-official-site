import { site } from '../data/site';

const Hero = () => {
  return (
    <section id="hero" className="min-h-screen flex items-center justify-center pt-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col items-center text-center space-y-8">
          <div className="space-y-2">
            <h1 className="text-2xl text-gray-300 tracking-wide font-light">
              {site.name}
            </h1>
            <p className="text-gray-400 text-lg font-light">
              {site.role}
            </p>
          </div>

          <div className="space-y-6">
            {site.headlines.map((headline, index) => (
              <h2 key={index} className="text-5xl lg:text-6xl font-light text-white leading-tight">
                {headline}
              </h2>
            ))}
          </div>

          <div className="flex space-x-4">
            {site.ctas.map((cta, index) => (
              <button
                key={index}
                onClick={() => document.getElementById(cta.target)?.scrollIntoView({ behavior: 'smooth' })}
                className={
                  index === 0
                    ? 'bg-gray-600 hover:bg-gray-500 text-white px-8 py-3 transition-colors font-light tracking-wide'
                    : 'border border-gray-600 hover:border-gray-500 text-white px-8 py-3 transition-colors font-light tracking-wide'
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
