import ClickableImage from './ClickableImage';
import { galleryItems } from '../data/gallery';

const Gallery = () => {
  return (
    <section id="gallery" className="py-20 bg-gray-900/30">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-light text-white mb-12 tracking-wide">
          COMMUNITY INVOLVEMENT
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {galleryItems.map((image) => (
            <div key={image.id} className="group cursor-pointer">
              <div className="bg-gray-800/50 border border-gray-700 hover:border-gray-600 transition-all duration-300 overflow-hidden">
                <div className="aspect-square bg-gray-900 overflow-hidden">
                  <ClickableImage 
                    src={image.src} 
                    alt={image.alt}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                
                <div className="p-4">
                  <h3 className="text-lg font-light text-white mb-2 group-hover:text-gray-300 transition-colors">
                    {image.title}
                  </h3>
                  <p className="text-gray-400 text-sm font-light">
                    {image.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-12 text-center">
          <p className="text-gray-300 font-light leading-relaxed max-w-3xl mx-auto">
            As Avionics Lead for the UTRGV Rocket Launchers Club, I actively participate in aerospace competitions, hackathons, and educational events. These experiences have shaped my technical skills while fostering collaboration and innovation within the aerospace community.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Gallery;
