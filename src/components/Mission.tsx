import ClickableImage from './ClickableImage';
import Icon from './Icons';
import SectionHeading from './SectionHeading';
import { about } from '../data/about';

const Mission = () => {
  return (
    <section id="about" className="py-24">
      <div className="max-w-7xl mx-auto px-6">
        <SectionHeading title={about.sectionTitle} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* Left: photo + highlights */}
          <div className="lg:col-span-5">
            {about.image && (
              <div className="w-full aspect-[4/3] bg-neutral-950 border border-white/10 overflow-hidden">
                <ClickableImage src={about.image} alt={about.imageAlt} className="w-full h-full object-cover" />
              </div>
            )}

            {about.stats.items.length > 0 && (
              <div className="mt-6 bg-white/[0.02] p-5 border border-white/10">
                <h4 className="text-white text-[11px] uppercase tracking-[0.18em] font-light mb-3">
                  {about.stats.title}
                </h4>
                <div className="flex flex-wrap gap-x-6 gap-y-1">
                  {about.stats.items.map((item, i) => (
                    <p key={i} className="text-neutral-400 text-sm font-light">{item}</p>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: paragraphs + highlights */}
          <div className="lg:col-span-7 space-y-6">
            {about.paragraphs.map((paragraph, index) => (
              <p key={index} className="text-neutral-300 leading-relaxed font-light">
                {paragraph}
              </p>
            ))}

            {about.highlights.length > 0 && (
              <div className="grid sm:grid-cols-3 gap-4 pt-4">
                {about.highlights.map((h, i) => (
                  <div key={i} className="bg-white/[0.02] p-5 border border-white/10">
                    <div className="bg-white/5 border border-white/10 p-2.5 text-white inline-flex mb-3">
                      <Icon name={h.icon} />
                    </div>
                    <h3 className="text-white font-light text-[15px] mb-1">{h.title}</h3>
                    <p className="text-neutral-400 text-[13px] font-light leading-relaxed">{h.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Mission;
