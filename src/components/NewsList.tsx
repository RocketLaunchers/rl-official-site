import { Link } from 'react-router-dom';
import SectionHeading from './SectionHeading';
import { news } from '../data/news';

/** Homepage list of the latest news/updates. */
const NewsList = () => {
  const latest = news.slice(0, 5);
  return (
    <section id="news" className="py-24">
      <div className="max-w-4xl mx-auto px-6">
        <SectionHeading title="NEWS" />

        <div className="space-y-10">
          {latest.length === 0 && <div className="text-neutral-500 font-light">No news yet.</div>}
          {latest.map((post) => (
            <Link
              key={post.id}
              to={`/news/${post.id}`}
              className="block border-l border-white/15 pl-6 hover:border-white transition-colors group cursor-pointer"
            >
              <div className="text-neutral-500 text-xs mb-3 tracking-[0.15em] uppercase font-light">
                {post.displayDate || post.date}
              </div>
              <h3 className="font-display text-2xl font-light text-white mb-3 tracking-tight group-hover:text-neutral-300 transition-colors">
                {post.title}
              </h3>
              <p className="text-neutral-400 leading-relaxed font-light mb-4 text-[15px]">{post.excerpt}</p>
              <div className="flex items-center gap-4 text-neutral-500">
                <span className="text-xs tracking-wide">{post.readTime}</span>
                <div className="flex flex-wrap gap-2">
                  {post.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="border border-white/10 text-neutral-400 text-[11px] tracking-wide px-2.5 py-1">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default NewsList;
