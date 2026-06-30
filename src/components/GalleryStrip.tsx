import ClickableImage from './ClickableImage';
import SectionHeading from './SectionHeading';
import { currentSeason } from '../data/seasons';
import { albumsForSeason, albums as allAlbums } from '../data/gallery';

/** Homepage gallery: the current season's album items (falls back to all albums). */
const GalleryStrip = () => {
  const seasonAlbums = currentSeason ? albumsForSeason(currentSeason.id) : [];
  const source = seasonAlbums.length ? seasonAlbums : allAlbums;
  const items = source.flatMap((a) => a.items).slice(0, 6);
  if (items.length === 0) return null;

  return (
    <section id="gallery" className="py-24">
      <div className="max-w-7xl mx-auto px-6">
        <SectionHeading title="GALLERY" />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((image) => (
            <div
              key={String(image.id)}
              className="group cursor-pointer border border-line/10 bg-surface hover:border-line/25 hover:bg-surface transition-all duration-300 overflow-hidden"
            >
              <div className="aspect-square bg-well overflow-hidden">
                <ClickableImage src={image.src} alt={image.alt} className="w-full h-full object-cover" />
              </div>
              {(image.title || image.description) && (
                <div className="p-5">
                  {image.title && (
                    <h3 className="font-display text-base font-light text-ink mb-1.5 tracking-tight group-hover:text-ink-soft transition-colors">
                      {image.title}
                    </h3>
                  )}
                  {image.description && (
                    <p className="text-ink-muted text-sm font-light leading-relaxed">{image.description}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default GalleryStrip;
