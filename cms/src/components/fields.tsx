import { useState, type ReactNode } from 'react';
import { mediaUrl } from '../api';

/** Shared form-field primitives used across every content editor. */

export function Field({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div className="field">
      {label && <label>{label}</label>}
      {children}
    </div>
  );
}

export function TextField({
  label, value, onChange, placeholder, mono, readOnly,
}: {
  label?: string; value: string; onChange?: (v: string) => void; placeholder?: string; mono?: boolean; readOnly?: boolean;
}) {
  return (
    <Field label={label}>
      <input
        value={value}
        placeholder={placeholder}
        readOnly={readOnly}
        style={mono ? { fontFamily: 'ui-monospace, monospace' } : undefined}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </Field>
  );
}

export function TextArea({
  label, value, onChange, placeholder, mono, minHeight,
}: {
  label?: string; value: string; onChange?: (v: string) => void; placeholder?: string; mono?: boolean; minHeight?: number;
}) {
  return (
    <Field label={label}>
      <textarea
        value={value}
        placeholder={placeholder}
        style={{ ...(mono ? { fontFamily: 'ui-monospace, monospace' } : {}), ...(minHeight ? { minHeight } : {}) }}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </Field>
  );
}

export function TagsField({ label, value, onChange }: { label?: string; value: string[]; onChange: (v: string[]) => void }) {
  const [text, setText] = useState(value.join(', '));
  return (
    <Field label={label}>
      <input
        value={text}
        placeholder="tag1, tag2"
        onChange={(e) => {
          setText(e.target.value);
          onChange(e.target.value.split(',').map((s) => s.trim()).filter(Boolean));
        }}
      />
    </Field>
  );
}

/** Editable list of strings with add / remove / reorder. */
export function StringListEditor({
  label, items, onChange, placeholder,
}: {
  label?: string; items: string[]; onChange: (items: string[]) => void; placeholder?: string;
}) {
  const set = (i: number, v: string) => onChange(items.map((it, j) => (j === i ? v : it)));
  const remove = (i: number) => onChange(items.filter((_, j) => j !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <Field label={label}>
      <div style={{ display: 'grid', gap: 8 }}>
        {items.map((it, i) => (
          <div className="row" key={i}>
            <input value={it} placeholder={placeholder} onChange={(e) => set(i, e.target.value)} />
            <button className="small ghost" title="Move up" onClick={() => move(i, -1)}>↑</button>
            <button className="small ghost" title="Move down" onClick={() => move(i, 1)}>↓</button>
            <button className="small danger" title="Remove" onClick={() => remove(i)}>✕</button>
          </div>
        ))}
        <button className="small ghost" style={{ justifySelf: 'start' }} onClick={() => onChange([...items, ''])}>＋ Add item</button>
      </div>
    </Field>
  );
}

/**
 * Consistent action row for any content item (block / tile / card / trait /
 * paragraph). Standardizes the CRUD affordances so delete always reads the same
 * way: ↑ ↓ everywhere, "Duplicate" where relevant, and a danger "Delete".
 */
export function ItemToolbar({
  onUp, onDown, onDuplicate, onDelete, deleteLabel = 'Delete',
}: {
  onUp?: () => void;
  onDown?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  deleteLabel?: string;
}) {
  return (
    <div className="item-tools">
      {onUp && <button className="small ghost" title="Move up" onClick={onUp}>↑</button>}
      {onDown && <button className="small ghost" title="Move down" onClick={onDown}>↓</button>}
      {onDuplicate && <button className="small ghost" title="Duplicate" onClick={onDuplicate}>Duplicate</button>}
      {onDelete && <button className="small danger" title={deleteLabel} onClick={onDelete}>{deleteLabel}</button>}
    </div>
  );
}

/** Image/video field with a live preview (Tauri asset protocol) and import button. */
export function ImageField({
  label, root, value, baseDir, onChange, onImport, kind = 'image',
}: {
  label?: string;
  root: string;
  value: string;
  baseDir?: string;
  onChange: (src: string) => void;
  onImport: () => Promise<string | null>;
  kind?: 'image' | 'media';
}) {
  const [busy, setBusy] = useState(false);
  const url = mediaUrl(root, value, baseDir);
  const isVideo = /\.(mp4|webm|ogv|mov)$/i.test(value);

  async function doImport() {
    setBusy(true);
    try {
      const src = await onImport();
      if (src) onChange(src);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Field label={label}>
      <div className="media-field">
        <div className="media-preview">
          {url ? (
            isVideo ? <video src={url} controls muted /> : <img src={url} alt="" />
          ) : (
            <div className="media-empty">no media</div>
          )}
        </div>
        <div className="media-controls">
          <input
            value={value}
            placeholder={kind === 'media' ? 'assets/img.jpg or /img.png' : '/img.png'}
            onChange={(e) => onChange(e.target.value)}
          />
          <div className="row">
            <button className="small" disabled={busy} onClick={doImport}>{busy ? 'Importing…' : 'Import…'}</button>
            {value && <button className="small ghost" onClick={() => onChange('')}>Clear</button>}
          </div>
        </div>
      </div>
    </Field>
  );
}
