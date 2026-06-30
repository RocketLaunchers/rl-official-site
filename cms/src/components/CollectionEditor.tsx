import { useEffect, useState, type ReactNode } from 'react';
import { countReferences, renameRecord, type Collection } from '../api';
import { ItemToolbar } from './fields';
import HelpPanel from './HelpPanel';
import { slugify } from '../util';

/**
 * Reusable scaffold for any "one JSON file per record" content type. Handles the
 * boilerplate shared by every collection editor — load, list, add, reorder-free
 * edit, save-all, delete, and status messages — so each concrete editor only
 * provides how to render one record's fields.
 */
export default function CollectionEditor<T extends { id: string }>({
  repo,
  title,
  hint,
  guide,
  api,
  makeSeed,
  newTitleLabel = 'Name',
  displayName,
  renderItem,
  sort,
}: {
  repo: string;
  title: string;
  hint?: string;
  /** Optional "How this screen works" panel shown above the hint. */
  guide?: { intro?: string; steps?: string[] };
  api: Collection<T>;
  /** Build a new record from the create form's name + slug. */
  makeSeed: (id: string, name: string) => unknown;
  newTitleLabel?: string;
  displayName: (item: T) => string;
  renderItem: (item: T, update: (patch: Partial<T>) => void) => ReactNode;
  sort?: (a: T, b: T) => number;
}) {
  const [items, setItems] = useState<T[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  // Rename-id state (one record at a time).
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameTo, setRenameTo] = useState('');
  const [renameRefs, setRenameRefs] = useState<number | null>(null);
  const [renameBusy, setRenameBusy] = useState(false);

  function reload() {
    return api
      .list(repo)
      .then((list) => setItems(sort ? [...list].sort(sort) : list))
      .catch((e) => setError(String(e)));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repo]);

  function update(id: string, patch: Partial<T>) {
    setItems((xs) => xs?.map((x) => (x.id === id ? { ...x, ...patch } : x)) ?? xs);
    setMsg(null);
  }

  async function saveAll() {
    if (!items) return;
    setSaving(true);
    setError(null);
    setMsg(null);
    try {
      for (const item of items) await api.save(repo, item);
      setMsg('Saved ✓');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function removeOne(item: T) {
    if (!confirm(`Delete ${api.label} “${displayName(item)}”? This removes its JSON file.`)) return;
    try {
      await api.remove(repo, item.id);
      setItems((xs) => xs?.filter((x) => x.id !== item.id) ?? xs);
      setMsg(`Deleted “${displayName(item)}”.`);
    } catch (e) {
      setError(String(e));
    }
  }

  async function create() {
    const slug = newSlug || slugify(newName);
    setError(null);
    try {
      const created = (await api.create(repo, makeSeed(slug, newName.trim()))) as T;
      setItems((xs) => [...(xs ?? []), created]);
      setShowNew(false);
      setNewName('');
      setNewSlug('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function openRename(item: T) {
    setError(null);
    setMsg(null);
    setRenaming(item.id);
    setRenameTo(slugify(displayName(item)) || item.id);
    setRenameRefs(api.refKind ? null : 0);
    if (api.refKind) {
      countReferences(repo, api.refKind, item.id)
        .then((n) => setRenameRefs(n))
        .catch(() => setRenameRefs(null));
    }
  }

  async function doRename(item: T) {
    setRenameBusy(true);
    setError(null);
    setMsg(null);
    const to = renameTo.trim();
    try {
      await api.save(repo, item); // persist any unsaved edits before the file moves
      const { refs } = await renameRecord(repo, api, item, to);
      await reload();
      setRenaming(null);
      setMsg(`Renamed “${item.id}” → “${to}”${refs ? ` · updated ${refs} reference${refs === 1 ? '' : 's'}` : ''}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRenameBusy(false);
    }
  }

  return (
    <div className="app">
      <div className="topbar">
        <h1 style={{ fontWeight: 400 }}>{title}</h1>
        <div className="spacer" />
        <button className="small ghost" onClick={() => setShowNew((v) => !v)}>＋ New</button>
        <button className="primary small" onClick={saveAll} disabled={!items || saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      <div className="content">
        <div className="container">
          {guide && <HelpPanel intro={guide.intro} steps={guide.steps} />}
          {hint && <p className="screen-hint">{hint}</p>}

          {showNew && (
            <div className="inline-form">
              <div>
                <label>{newTitleLabel}</label>
                <input
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value);
                    setNewSlug(slugify(e.target.value));
                  }}
                  placeholder={newTitleLabel}
                />
              </div>
              <div>
                <label>Id (file name)</label>
                <input value={newSlug} onChange={(e) => setNewSlug(e.target.value)} placeholder="kebab-case-id" />
              </div>
              <div className="row">
                <button className="primary" disabled={!newName.trim() || !newSlug} onClick={create}>Create</button>
                <button className="ghost" onClick={() => setShowNew(false)}>Cancel</button>
              </div>
            </div>
          )}

          {error && <div className="notice error">{error}</div>}
          {msg && <div className="notice ok">{msg}</div>}

          {items === null ? (
            <div className="empty">Loading…</div>
          ) : items.length === 0 ? (
            <div className="empty">Nothing yet. Add one.</div>
          ) : (
            items.map((item) => (
              <div className="tile" key={item.id}>
                <div className="tile-head">
                  <span className="tile-title">{displayName(item) || item.id}</span>
                  <span className="block-id">{item.id}.json</span>
                  <button
                    className="small ghost"
                    title="Rename the id / file name and update everything that references it"
                    onClick={() => (renaming === item.id ? setRenaming(null) : openRename(item))}
                  >
                    ✎ Rename ID
                  </button>
                  <ItemToolbar onDelete={() => removeOne(item)} />
                </div>
                {renaming === item.id && (
                  <div className="inline-form">
                    <div>
                      <label>New id (file name)</label>
                      <input
                        value={renameTo}
                        autoFocus
                        placeholder="kebab-case-id"
                        onChange={(e) => setRenameTo(e.target.value)}
                      />
                    </div>
                    <p className="screen-hint" style={{ margin: 0 }}>
                      {!api.refKind
                        ? 'Nothing else references this id — only the file is renamed.'
                        : renameRefs === null
                        ? 'Checking references…'
                        : `Will update ${renameRefs} reference${renameRefs === 1 ? '' : 's'} across other content.`}
                    </p>
                    <div className="row">
                      <button
                        className="primary"
                        disabled={renameBusy || !renameTo.trim() || renameTo.trim() === item.id}
                        onClick={() => doRename(item)}
                      >
                        {renameBusy ? 'Renaming…' : 'Rename'}
                      </button>
                      <button className="ghost" disabled={renameBusy} onClick={() => setRenaming(null)}>Cancel</button>
                    </div>
                  </div>
                )}
                {renderItem(item, (patch) => update(item.id, patch))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
