import type { MediaItem } from '@portfolio/content-schema';
import { Field } from './fields';
import { useAssetPicker } from './AssetPicker';

/** Editor for a media gallery (images / videos / 3D models) — shared by rockets and subteams.
 *  Picks from assets already in the repo; new files are imported in Tools → Assets. */
export default function MediaListEditor({
  media,
  onChange,
  label = 'Media gallery — images / videos / 3D models',
}: {
  repo: string;
  media: MediaItem[];
  onChange: (m: MediaItem[]) => void;
  label?: string;
}) {
  const { pickAsset } = useAssetPicker();
  const set = (i: number, patch: Partial<MediaItem>) => onChange(media.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= media.length) return;
    const next = [...media];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const chooseFor = async (i: number, type: MediaItem['type']) => {
    const ref = await pickAsset({ kinds: [type], title: `Choose a ${type}` });
    if (ref) set(i, { src: ref });
  };

  return (
    <Field label={label}>
      <div style={{ display: 'grid', gap: 10 }}>
        {media.map((item, i) => (
          <div key={i} className="tile" style={{ margin: 0, padding: 10 }}>
            <div className="row">
              <select value={item.type} onChange={(e) => set(i, { type: e.target.value as MediaItem['type'] })} style={{ width: 110 }}>
                <option value="image">image</option>
                <option value="video">video</option>
                <option value="model">model</option>
              </select>
              <input value={item.src} readOnly placeholder="— none selected —" title={item.src} />
              <button className="small" onClick={() => chooseFor(i, item.type)}>Choose…</button>
              <button className="small ghost" title="Move up" onClick={() => move(i, -1)}>↑</button>
              <button className="small ghost" title="Move down" onClick={() => move(i, 1)}>↓</button>
              <button className="small danger" title="Remove" onClick={() => onChange(media.filter((_, j) => j !== i))}>✕</button>
            </div>
            <input value={item.caption ?? ''} placeholder="caption (optional)" style={{ marginTop: 8 }} onChange={(e) => set(i, { caption: e.target.value || undefined })} />
          </div>
        ))}
        <button className="small ghost" style={{ justifySelf: 'start' }} onClick={() => onChange([...media, { type: 'image', src: '' }])}>＋ Add media</button>
      </div>
    </Field>
  );
}
