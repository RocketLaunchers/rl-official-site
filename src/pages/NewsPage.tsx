import { Link } from 'react-router-dom';
import PageShell from '../components/PageShell';
import { news } from '../data/news';

/** Blog-style index of everything the team has written up. */
export default function NewsPage() {
  return (
    <PageShell
      title="News"
      intro="Build logs, write-ups, and deep dives — how we design, test, and fly our rockets, in our own words."
    >
      {news.length === 0 ? (
        <p className="text-ink-faint font-light">No posts yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {news.map((post) => (
            <Link
              key={post.id}
              to={`/news/${post.id}`}
              className="group border border-line/10 bg-surface hover:border-line/25 hover:bg-surface-2 transition-all duration-300 flex flex-col overflow-hidden"
            >
              {post.coverImage && (
                <div className="aspect-[16/9] bg-well border-b border-line/10 overflow-hidden">
                  <img
                    src={post.coverImage}
                    alt={post.title}
                    loading="lazy"
                    className="w-full h-full object-cover opacity-85 group-hover:opacity-100 group-hover:scale-[1.03] transition-all duration-500 ease-out"
                  />
                </div>
              )}
              <div className="p-6 flex flex-col flex-1">
                <div className="text-ink-faint text-xs mb-3 tracking-[0.15em] uppercase font-light">
                  {post.displayDate || post.date}
                </div>
                <h3 className="font-display text-xl font-light text-ink mb-3 tracking-tight group-hover:text-ink-soft transition-colors">
                  {post.title}
                </h3>
                <p className="text-ink-muted leading-relaxed font-light mb-4 text-[15px] flex-1">{post.excerpt}</p>
                <div className="flex items-center gap-4 text-ink-faint">
                  {post.readTime && <span className="text-xs tracking-wide">{post.readTime}</span>}
                  <div className="flex flex-wrap gap-2">
                    {post.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="border border-line/10 text-ink-muted text-[11px] tracking-wide px-2.5 py-1">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  );
}
