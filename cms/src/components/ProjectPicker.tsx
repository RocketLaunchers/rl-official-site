import { useState } from 'react';
import { pickRepo, validateRepo, type RepoValidation } from '../api';

export default function ProjectPicker({
  recent,
  onOpen,
}: {
  recent: string | null;
  onOpen: (path: string) => void;
}) {
  const [candidate, setCandidate] = useState<string | null>(null);
  const [validation, setValidation] = useState<RepoValidation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function inspect(path: string) {
    setError(null);
    setBusy(true);
    setCandidate(path);
    try {
      setValidation(await validateRepo(path));
    } catch (e) {
      setError(String(e));
      setValidation(null);
    } finally {
      setBusy(false);
    }
  }

  async function choose() {
    setError(null);
    try {
      const path = await pickRepo();
      if (path) await inspect(path);
    } catch (e) {
      setError(String(e));
    }
  }

  return (
    <div className="center">
      <div className="card">
        <h2>Portfolio CMS</h2>
        <p className="sub">Open your portfolio repository to manage its content.</p>

        <div className="row">
          <button className="primary" onClick={choose}>Choose folder…</button>
          {recent && !candidate && (
            <button className="ghost" onClick={() => inspect(recent)}>Reopen recent</button>
          )}
        </div>
        {recent && !candidate && (
          <p className="muted" style={{ fontSize: 12, marginTop: 10, fontFamily: 'ui-monospace, monospace', wordBreak: 'break-all' }}>
            {recent}
          </p>
        )}

        {candidate && (
          <>
            <p className="muted" style={{ fontSize: 12, marginTop: 18, fontFamily: 'ui-monospace, monospace', wordBreak: 'break-all' }}>
              {candidate}
            </p>
            {validation && (
              <ul className="checks">
                {validation.checks.map((c) => (
                  <li key={c.label}>
                    <span className={`dot ${c.exists ? 'ok' : c.required ? 'bad' : 'opt'}`} />
                    <span>{c.label}</span>
                    <code>{c.exists ? 'found' : c.required ? 'missing' : 'optional — missing'}</code>
                  </li>
                ))}
              </ul>
            )}
            <button className="primary" disabled={busy || !validation?.ok} onClick={() => onOpen(candidate)}>
              Open repository
            </button>
          </>
        )}

        {error && <div className="notice error">{error}</div>}
      </div>
    </div>
  );
}
