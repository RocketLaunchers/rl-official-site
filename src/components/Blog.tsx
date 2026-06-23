import { Link } from 'react-router-dom';
import { blogPosts } from '../data/blogPosts';

const Blog = () => {
  return (
    <section id="blog" className="py-24">
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex items-center gap-6 mb-14">
          <h2 className="font-display text-3xl md:text-4xl font-light tracking-[0.12em] text-white whitespace-nowrap">
            BLOG
          </h2>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <div className="space-y-10">
          {blogPosts.length === 0 && (
            <div className="text-neutral-500 font-light">No blog posts available.</div>
          )}
          {blogPosts.map((post, index) => (
            <Link
              key={index}
              to={`/blog/${post.id}`}
              className="block border-l border-white/15 pl-6 hover:border-white transition-colors group cursor-pointer"
            >
              <div className="text-neutral-500 text-xs mb-3 tracking-[0.15em] uppercase font-light">
                {post.displayDate || post.date}
              </div>
              <h3 className="font-display text-2xl font-light text-white mb-3 tracking-tight group-hover:text-neutral-300 transition-colors">
                {post.title}
              </h3>
              <p className="text-neutral-400 leading-relaxed font-light mb-4 text-[15px]">
                {post.excerpt}
              </p>
              <div className="flex items-center gap-4 text-neutral-500">
                <span className="text-xs tracking-wide">{post.readTime}</span>
                <div className="flex flex-wrap gap-2">
                  {post.tags.slice(0, 3).map((tag, tagIndex) => (
                    <span key={tagIndex} className="border border-white/10 text-neutral-400 text-[11px] tracking-wide px-2.5 py-1">
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

export default Blog;
