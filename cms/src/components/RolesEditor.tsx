import { rolesApi, type Role } from '../api';
import CollectionEditor from './CollectionEditor';
import { Field, TextArea, TextField } from './fields';

export default function RolesEditor({ repo }: { repo: string }) {
  return (
    <CollectionEditor<Role>
      repo={repo}
      title="Roles"
      hint="Officer and subteam role definitions — not hardcoded, so the org structure can change every year. Assign roles to people per-season in the Seasons editor."
      api={rolesApi}
      newTitleLabel="Role name"
      makeSeed={(id, name) => ({ type: 'role', id, name })}
      displayName={(r) => r.name}
      sort={(a, b) => a.displayOrder - b.displayOrder}
      renderItem={(r, update) => (
        <>
          <div className="grid2">
            <TextField label="Name" value={r.name} onChange={(v) => update({ name: v })} />
            <TextField label="Category" value={r.category} placeholder="Executive / Engineering / Subteam Lead" onChange={(v) => update({ category: v })} />
          </div>
          <TextArea label="Description" value={r.description} onChange={(v) => update({ description: v })} />
          <div className="grid2">
            <Field label="Display order (lower = first)">
              <input type="number" value={r.displayOrder} onChange={(e) => update({ displayOrder: Number(e.target.value) })} />
            </Field>
            <Field label="Flags">
              <div className="checkboxes">
                <label><input type="checkbox" checked={r.isLeadership} onChange={(e) => update({ isLeadership: e.target.checked })} /> Leadership</label>
                <label><input type="checkbox" checked={r.isSubteamRole} onChange={(e) => update({ isSubteamRole: e.target.checked })} /> Subteam role</label>
                <label><input type="checkbox" checked={r.active} onChange={(e) => update({ active: e.target.checked })} /> Active</label>
              </div>
            </Field>
          </div>
        </>
      )}
    />
  );
}
