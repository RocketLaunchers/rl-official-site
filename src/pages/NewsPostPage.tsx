import { useParams } from 'react-router-dom';
import PageShell from '../components/PageShell';
import BlockRenderer from '../components/BlockRenderer';
import { newsById } from '../data/news';

export default function NewsPostPage() {
  const { id } = useParams<{ id: string }>();
  const post = id ? newsById(id) : undefined;

  if (!post) {
    return (
      <PageShell title="Post not found" backTo="/" backLabel="Home">
        <p className="text-ink-muted font-light">That post doesn’t exist.</p>
      </PageShell>
    );
  }

  return (
    <PageShell title={post.title} backTo="/#news" backLabel="All news">
      <div className="max-w-3xl -mt-4">
        <div className="flex items-center gap-3 text-ink-faint font-light text-sm tracking-wide mb-2">
          <span>{post.displayDate || post.date}</span>
          {post.readTime && <span className="text-ink-faint">•</span>}
          {post.readTime && <span>{post.readTime}</span>}
        </div>
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-10">
            {post.tags.map((tag) => (
              <span key={tag} className="border border-line/10 text-ink-muted text-xs tracking-wide px-3 py-1 font-light">
                {tag}
              </span>
            ))}
          </div>
        )}
        <article className="prose prose-invert max-w-none">
          <BlockRenderer blocks={post.blocks} />
        </article>
      </div>
    </PageShell>
  );
}
