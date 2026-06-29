import { subteamsApi, importPublicImage, type Subteam } from '../api';
import CollectionEditor from './CollectionEditor';
import MediaListEditor from './MediaListEditor';
import { Field, ImageField, StringListEditor, TagsField, TextArea, TextField } from './fields';

const ICONS = ['rocket', 'cpu', 'bolt', 'puzzle', 'star', 'users', 'lightbulb', 'code', 'book'];
const STATUSES = ['active', 'archived', 'proposed'];

export default function SubteamsEditor({ repo }: { repo: string }) {
  return (
    <CollectionEditor<Subteam>
      repo={repo}
      title="Subteams"
      hint="Subteam identities persist across years. Their per-season lead comes from the season roster; this record holds the durable description."
      api={subteamsApi}
      newTitleLabel="Subteam name"
      makeSeed={(id, name) => ({ type: 'subteam', id, name })}
      displayName={(s) => s.name}
      sort={(a, b) => a.displayOrder - b.displayOrder}
      renderItem={(s, update) => (
        <>
          <TextField label="Name" value={s.name} onChange={(v) => update({ name: v })} />
          <TextField label="Short description" value={s.shortDescription} onChange={(v) => update({ shortDescription: v })} />
          <TextArea label="Long description" value={s.longDescription} onChange={(v) => update({ longDescription: v })} />
          <div className="grid2">
            <Field label="Icon">
              <select value={s.icon} onChange={(e) => update({ icon: e.target.value })}>
                {ICONS.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select value={s.status} onChange={(e) => update({ status: e.target.value as Subteam['status'] })}>
                {STATUSES.map((st) => <option key={st} value={st}>{st}</option>)}
              </select>
            </Field>
            <TextField label="Created season id" value={s.createdSeason} placeholder="2025-2026" onChange={(v) => update({ createdSeason: v })} />
            <Field label="Display order">
              <input type="number" value={s.displayOrder} onChange={(e) => update({ displayOrder: Number(e.target.value) })} />
            </Field>
          </div>
          <ImageField label="Image" root={repo} value={s.image} onChange={(src) => update({ image: src })} onImport={() => importPublicImage(repo)} />
          <StringListEditor label="Skills" items={s.skills} onChange={(skills) => update({ skills })} placeholder="Embedded C/Rust" />
          <StringListEditor label="Tools" items={s.tools} onChange={(tools) => update({ tools })} placeholder="KiCad" />
          <TagsField label="Related rocket ids (comma-separated)" value={s.relatedRockets} onChange={(relatedRockets) => update({ relatedRockets })} />
          <MediaListEditor repo={repo} media={s.media} onChange={(media) => update({ media })} />
        </>
      )}
    />
  );
}
