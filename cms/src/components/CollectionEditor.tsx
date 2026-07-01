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
  // Find / focus: filter the list, collapse cards to just name+id, and select
  // several at once for bulk delete.
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  function reload() {
    return api
      .list(repo)
      .then((list) => {
        const sorted = sort ? [...list].sort(sort) : list;
        setItems(sorted);
        // Start compact: every card collapsed to name + id. Editing expands it.
        setCollapsed(new Set(sorted.map((x) => x.id)));
      })
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
      dropFromSets(item.id);
      setMsg(`Deleted “${displayName(item)}”.`);
    } catch (e) {
      setError(String(e));
    }
  }

  /** Remove an id from the collapse/select sets after its record is gone. */
  function dropFromSets(id: string) {
    setSelected((s) => {
      if (!s.has(id)) return s;
      const n = new Set(s);
      n.delete(id);
      return n;
    });
    setCollapsed((s) => {
      if (!s.has(id)) return s;
      const n = new Set(s);
      n.delete(id);
      return n;
    });
  }

  async function bulkDelete() {
    const ids = [...selected];
    if (!ids.length) return;
    if (!confirm(`Delete ${ids.length} ${api.label}${ids.length === 1 ? '' : 's'}? This removes their JSON files and can’t be undone.`))
      return;
    setBulkBusy(true);
    setError(null);
    setMsg(null);
    const done: string[] = [];
    let failure: string | null = null;
    for (const id of ids) {
      try {
        await api.remove(repo, id);
        done.push(id);
      } catch (e) {
        failure = e instanceof Error ? e.message : String(e);
        break; // stop on first failure; report how far we got
      }
    }
    if (done.length) {
      const gone = new Set(done);
      setItems((xs) => xs?.filter((x) => !gone.has(x.id)) ?? xs);
      setSelected((s) => new Set([...s].filter((id) => !gone.has(id))));
      setCollapsed((s) => new Set([...s].filter((id) => !gone.has(id))));
    }
    if (failure) setError(`Deleted ${done.length} of ${ids.length}. Stopped on error: ${failure}`);
    else setMsg(`Deleted ${done.length} ${api.label}${done.length === 1 ? '' : 's'}.`);
    setBulkBusy(false);
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

  const q = query.trim().toLowerCase();
  const filtered = (items ?? []).filter(
    (it) => !q || displayName(it).toLowerCase().includes(q) || it.id.toLowerCase().includes(q),
  );
  const allCollapsed = filtered.length > 0 && filtered.every((it) => collapsed.has(it.id));
  const selectedInView = filtered.filter((it) => selected.has(it.id)).length;
  const allFilteredSelected = filtered.length > 0 && selectedInView === filtered.length;

  function toggleIn(setState: typeof setCollapsed, id: string) {
    setState((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }
  function toggleAllCollapsed() {
    setCollapsed((s) => {
      if (allCollapsed) return new Set<string>(); // expand all
      const n = new Set(s);
      filtered.forEach((it) => n.add(it.id));
      return n;
    });
  }
  function toggleSelectAll() {
    setSelected((s) => {
      const n = new Set(s);
      if (allFilteredSelected) filtered.forEach((it) => n.delete(it.id));
      else filtered.forEach((it) => n.add(it.id));
      return n;
    });
  }
  function exitSelectMode() {
    setSelectMode(false);
    setSelected(new Set());
  }

  return (
    <div className="app">
      <div className="topbar">
        <h1 style={{ fontWeight: 400 }}>{title}</h1>
        <div className="spacer" />
        {items && items.length > 0 && (
          <>
            <button
              className="small ghost"
              title="Select several records to delete at once"
              onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
            >
              {selectMode ? '✕ Done' : '☑ Select'}
            </button>
            <button className="small ghost" title="Collapse or expand every card" onClick={toggleAllCollapsed}>
              {allCollapsed ? 'Expand all' : 'Collapse all'}
            </button>
          </>
        )}
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

          {items && items.length > 1 && (
            <div className="list-search">
              <input
                type="search"
                placeholder={`Search ${title.toLowerCase()} by name or id…`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {q && (
                <span className="list-count">
                  {filtered.length} / {items.length}
                </span>
              )}
            </div>
          )}

          {selectMode && items && items.length > 0 && (
            <div className="bulk-bar">
              <label className="bulk-all">
                <input type="checkbox" checked={allFilteredSelected} onChange={toggleSelectAll} />
                Select all{q ? ' matching' : ''}
              </label>
              <div className="spacer" />
              <span className="bulk-count">{selected.size} selected</span>
              <button className="small ghost" disabled={!selected.size} onClick={() => setSelected(new Set())}>
                Clear
              </button>
              <button className="small danger" disabled={!selected.size || bulkBusy} onClick={bulkDelete}>
                {bulkBusy ? 'Deleting…' : `Delete ${selected.size || ''}`.trim()}
              </button>
            </div>
          )}

          {items === null ? (
            <div className="empty">Loading…</div>
          ) : items.length === 0 ? (
            <div className="empty">Nothing yet. Add one.</div>
          ) : filtered.length === 0 ? (
            <div className="empty">No matches for “{query.trim()}”.</div>
          ) : (
            filtered.map((item) => {
              const isCollapsed = collapsed.has(item.id);
              const isSelected = selected.has(item.id);
              return (
              <div className={`tile${isSelected ? ' selected' : ''}`} key={item.id}>
                <div className="tile-head">
                  {selectMode && (
                    <input
                      type="checkbox"
                      className="tile-check"
                      checked={isSelected}
                      onChange={() => toggleIn(setSelected, item.id)}
                      aria-label={`Select ${displayName(item) || item.id}`}
                    />
                  )}
                  <button
                    className="small ghost tile-collapse"
                    title={isCollapsed ? 'Expand' : 'Collapse'}
                    onClick={() => toggleIn(setCollapsed, item.id)}
                  >
                    {isCollapsed ? '▸' : '▾'}
                  </button>
                  <span className="tile-title tile-toggle" onClick={() => toggleIn(setCollapsed, item.id)}>
                    {displayName(item) || item.id}
                  </span>
                  <span className="block-id">{item.id}.json</span>
                  {!selectMode && !isCollapsed && (
                    <button
                      className="small ghost"
                      title="Rename the id / file name and update everything that references it"
                      onClick={() => (renaming === item.id ? setRenaming(null) : openRename(item))}
                    >
                      ✎ Rename ID
                    </button>
                  )}
                  {!selectMode && <ItemToolbar onDelete={() => removeOne(item)} />}
                </div>
                {!isCollapsed && renaming === item.id && (
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
                {!isCollapsed && renderItem(item, (patch) => update(item.id, patch))}
              </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
