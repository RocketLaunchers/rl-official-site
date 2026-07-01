import { rocketsApi, type Rocket } from '../api';
import type { RocketSubsystem } from '@portfolio/content-schema';
import CollectionEditor from './CollectionEditor';
import MediaListEditor from './MediaListEditor';
import { Field, ImageField, TagsField, TextArea, TextField } from './fields';

const STATUSES = ['Concept', 'In Design', 'Manufacturing', 'Testing', 'Launched', 'Retired'];
const SPEC_KEYS: (keyof Rocket['specs'])[] = ['targetAltitude', 'motor', 'diameter', 'length', 'mass'];

function SubsystemsEditor({ subsystems, onChange }: { subsystems: RocketSubsystem[]; onChange: (s: RocketSubsystem[]) => void }) {
  const set = (i: number, patch: Partial<RocketSubsystem>) => onChange(subsystems.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  return (
    <Field label="Subsystems">
      <div style={{ display: 'grid', gap: 10 }}>
        {subsystems.map((s, i) => (
          <div key={i} className="tile" style={{ margin: 0, padding: 10 }}>
            <div className="row">
              <input value={s.name} placeholder="Avionics" onChange={(e) => set(i, { name: e.target.value })} style={{ maxWidth: 200 }} />
              <button className="small danger" onClick={() => onChange(subsystems.filter((_, j) => j !== i))}>✕</button>
            </div>
            <textarea value={s.summary} placeholder="What this subsystem does on this rocket" style={{ marginTop: 8 }} onChange={(e) => set(i, { summary: e.target.value })} />
          </div>
        ))}
        <button className="small ghost" style={{ justifySelf: 'start' }} onClick={() => onChange([...subsystems, { name: '', summary: '' }])}>＋ Add subsystem</button>
      </div>
    </Field>
  );
}

export default function RocketsEditor({ repo }: { repo: string }) {
  return (
    <CollectionEditor<Rocket>
      repo={repo}
      title="Rockets"
      hint="Each rocket is a permanent archive entry. Reference subteam and person ids by their file names."
      guide={{
        intro: 'Each rocket is a permanent archive entry. Set which rocket is the current build per-season in the Seasons tab.',
        steps: [
          'Click “＋ New”, type the rocket name, and Create.',
          'Set its status, competition, mission, and specs.',
          'Add a hero image, a 3D model, and any media.',
          'Record results and lessons learned once it has flown.',
          'Use the ↑ / ↓ buttons on each card to set the order rockets are listed (top = first).',
          'Click Save, then Publish.',
        ],
      }}
      api={rocketsApi}
      newTitleLabel="Rocket name"
      makeSeed={(id, name) => ({ type: 'rocket', id, name })}
      displayName={(r) => r.name}
      sort={(a, b) => a.displayOrder - b.displayOrder}
      reorderable
      renderItem={(r, update) => (
        <>
          <div className="grid2">
            <TextField label="Name" value={r.name} onChange={(v) => update({ name: v })} />
            <Field label="Status">
              <select value={r.status} onChange={(e) => update({ status: e.target.value as Rocket['status'] })}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <TextField label="Competition" value={r.competition} onChange={(v) => update({ competition: v })} />
          </div>
          <TagsField label="Season ids (comma-separated)" value={r.seasons} onChange={(seasons) => update({ seasons })} />
          <TextArea label="Mission" value={r.mission} onChange={(v) => update({ mission: v })} />

          <div className="grid2">
            {SPEC_KEYS.map((k) => (
              <TextField key={k} label={k} value={r.specs[k]} onChange={(v) => update({ specs: { ...r.specs, [k]: v } })} />
            ))}
          </div>

          <ImageField label="Hero image" root={repo} value={r.heroImage} onChange={(src) => update({ heroImage: src })} aspect={16 / 9} />
          <ImageField label="3D model (GLB)" kind="model" root={repo} value={r.model3d} onChange={(src) => update({ model3d: src })} />
          <MediaListEditor repo={repo} media={r.media} onChange={(media) => update({ media })} />

          <SubsystemsEditor subsystems={r.subsystems} onChange={(subsystems) => update({ subsystems })} />
          <TextArea label="Results" value={r.results} onChange={(v) => update({ results: v })} />
          <TextArea label="Lessons learned" value={r.lessonsLearned} onChange={(v) => update({ lessonsLearned: v })} />
          <TagsField label="Related subteam ids" value={r.relatedSubteams} onChange={(relatedSubteams) => update({ relatedSubteams })} />
          <TagsField label="Credits — person ids" value={r.credits} onChange={(credits) => update({ credits })} />
        </>
      )}
    />
  );
}
