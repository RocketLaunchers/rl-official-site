import { rolesApi, type Role } from '../api';
import CollectionEditor from './CollectionEditor';
import { Field, TextArea, TextField } from './fields';

export default function RolesEditor({ repo }: { repo: string }) {
  return (
    <CollectionEditor<Role>
      repo={repo}
      title="Roles"
      hint="Officer and subteam role definitions — not hardcoded, so the org structure can change every year. Assign roles to people per-season in the Seasons editor."
      guide={{
        intro: 'Roles come in two kinds: subteam position levels (Lead, Co-Lead, Member) that combine with a subteam in the roster to read “Avionics Lead”, and org-wide officer roles (President, Treasurer, …). Putting a person in a role happens per-season in Seasons → Roster.',
        steps: [
          'Click “＋ New”, type the role name, and Create.',
          'Set Scope: “Subteam role” for Lead / Co-Lead / Member, or “Org-wide officer”.',
          'Set its Category and Description, and tick the flags (Leadership, Subteam role, Active).',
          'Use the ↑ / ↓ buttons on each role card to set the order (top = first). This order drives the team roster on the site — the same roles line up the same way every season.',
          'Click Save, then Publish.',
        ],
      }}
      api={rolesApi}
      newTitleLabel="Role name"
      makeSeed={(id, name) => ({ type: 'role', id, name })}
      displayName={(r) => r.name}
      sort={(a, b) => a.displayOrder - b.displayOrder}
      reorderable
      renderItem={(r, update) => (
        <>
          <div className="grid2">
            <TextField label="Name" value={r.name} onChange={(v) => update({ name: v })} />
            <TextField label="Category" value={r.category} placeholder="Executive / Engineering / Subteam Lead" onChange={(v) => update({ category: v })} />
          </div>
          <TextArea label="Description" value={r.description} onChange={(v) => update({ description: v })} />
          <Field label="Scope">
            <select value={r.scope ?? 'org'} onChange={(e) => update({ scope: e.target.value as Role['scope'] })}>
              <option value="subteam">Subteam role (combines with a subteam)</option>
              <option value="org">Org-wide officer (no subteam)</option>
            </select>
          </Field>
          <Field label="Flags">
            <div className="checkboxes">
              <label><input type="checkbox" checked={r.isLeadership} onChange={(e) => update({ isLeadership: e.target.checked })} /> Leadership</label>
              <label><input type="checkbox" checked={r.isSubteamRole} onChange={(e) => update({ isSubteamRole: e.target.checked })} /> Subteam role</label>
              <label><input type="checkbox" checked={r.active} onChange={(e) => update({ active: e.target.checked })} /> Active</label>
            </div>
          </Field>
        </>
      )}
    />
  );
}
