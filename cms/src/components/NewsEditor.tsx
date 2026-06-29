import { useCallback, useEffect, useState } from 'react';
import { listNews, createNews, deleteNews, type NewsSummary } from '../api';
import { slugify } from '../util';

/** The news list: create / open / delete posts. Editing a post opens the block Editor. */
export default function NewsEditor({ onOpenPost, repo }: { repo: string; onOpenPost: (slug: string) => void }) {
  const [posts, setPosts] = useState<NewsSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      setPosts(await listNews(repo));
    } catch (e) {
      setError(String(e));
    }
  }, [repo]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function create() {
    setCreating(true);
    setError(null);
    try {
      const slug = newSlug || slugify(newTitle);
      await createNews(repo, slug, newTitle.trim());
      setShowNew(false);
      setNewTitle('');
      setNewSlug('');
      onOpenPost(slug);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  }

  async function remove(p: NewsSummary) {
    if (!confirm(`Delete news post “${p.title}”? This removes its folder and assets.`)) return;
    setError(null);
    try {
      await deleteNews(repo, p.slug);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="app">
      <div className="topbar">
        <h1 style={{ fontWeight: 400 }}>News</h1>
        <div className="spacer" />
        <button className="small ghost" onClick={refresh}>Refresh</button>
        <button className="primary small" onClick={() => setShowNew((v) => !v)}>＋ New post</button>
      </div>

      <div className="content">
        <div className="container">
          {showNew && (
            <div className="inline-form">
              <div>
                <label>Title</label>
                <input value={newTitle} onChange={(e) => { setNewTitle(e.target.value); setNewSlug(slugify(e.target.value)); }} placeholder="MARV Manufacturing Update" />
              </div>
              <div>
                <label>Slug (folder name)</label>
                <input value={newSlug} onChange={(e) => setNewSlug(e.target.value)} placeholder="marv-manufacturing-update" />
              </div>
              <div className="row">
                <button className="primary" disabled={creating || !newTitle.trim() || !newSlug} onClick={create}>Create draft</button>
                <button className="ghost" onClick={() => setShowNew(false)}>Cancel</button>
              </div>
            </div>
          )}

          {error && <div className="notice error">{error}</div>}

          {posts === null ? (
            <div className="empty">Loading…</div>
          ) : posts.length === 0 ? (
            <div className="empty">No posts yet. Create your first draft.</div>
          ) : (
            <table className="posts">
              <thead>
                <tr><th>Title</th><th>Status</th><th>Date</th><th>Season</th><th>Blocks</th><th /></tr>
              </thead>
              <tbody>
                {posts.map((p) => (
                  <tr key={p.slug}>
                    <td className="title">
                      {p.title}
                      <div className="muted" style={{ fontSize: 11, fontFamily: 'ui-monospace, monospace' }}>{p.slug}</div>
                    </td>
                    <td>
                      {p.valid ? <span className={`badge ${p.status}`}>{p.status}</span> : <span className="badge invalid" title={p.error}>invalid</span>}
                    </td>
                    <td className="muted">{p.displayDate || p.date || '—'}</td>
                    <td className="muted">{p.season || '—'}</td>
                    <td className="muted">{p.blockCount}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="item-tools" style={{ justifyContent: 'flex-end' }}>
                        <button className="small" onClick={() => onOpenPost(p.slug)}>Open</button>
                        <button className="small danger" onClick={() => remove(p)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
