import { useCallback, useEffect, useState } from 'react';
import { gitStatus, gitCommit, gitPush, type GitStatus } from '../api';

/**
 * Publish panel: commit content changes under "content update" and push so the
 * site redeploys. Git stays visible (branch, changed files, command output)
 * rather than fully hidden.
 */
export default function Publish({ repo }: { repo: string }) {
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [log, setLog] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | 'commit' | 'push' | 'refresh'>(null);

  const refresh = useCallback(async () => {
    setBusy('refresh');
    setError(null);
    try {
      setStatus(await gitStatus(repo));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }, [repo]);

  useEffect(() => { refresh(); }, [refresh]);

  async function commit() {
    setBusy('commit');
    setError(null);
    try {
      setLog(await gitCommit(repo, 'content update') || 'Committed.');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function push() {
    setBusy('push');
    setError(null);
    try {
      setLog(await gitPush(repo) || 'Pushed.');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="app">
      <div className="topbar">
        <h1 style={{ fontWeight: 400 }}>Publish</h1>
        <div className="spacer" />
        <button className="small ghost" onClick={refresh} disabled={!!busy}>Refresh</button>
      </div>

      <div className="content">
        <div className="container">
          <p className="muted" style={{ marginTop: 0 }}>
            Commit your content changes and push so the website redeploys.
            {status && <> Branch: <code>{status.branch || '—'}</code>.</>}
          </p>

          <div className="row" style={{ marginBottom: 18 }}>
            <button className="primary" disabled={!!busy || (status?.clean ?? true)} onClick={commit}>
              {busy === 'commit' ? 'Committing…' : 'Commit “content update”'}
            </button>
            <button className="primary" disabled={!!busy} onClick={push}>
              {busy === 'push' ? 'Pushing…' : 'Push'}
            </button>
          </div>

          {error && <div className="notice error">{error}</div>}
          {log && <div className="notice ok" style={{ fontFamily: 'ui-monospace, monospace' }}>{log}</div>}

          <div className="section-title">Changed files {status ? `(${status.changes.length})` : ''}</div>
          {status === null ? (
            <div className="empty">Loading…</div>
          ) : status.clean ? (
            <div className="empty">Working tree clean — nothing to commit.</div>
          ) : (
            <pre className="git-changes">{status.changes.join('\n')}</pre>
          )}
        </div>
      </div>
    </div>
  );
}
