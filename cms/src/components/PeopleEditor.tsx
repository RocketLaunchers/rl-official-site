import { peopleApi, type Person } from '../api';
import CollectionEditor from './CollectionEditor';
import { CustomFieldsEditor, Field, ImageField, TextArea, TextField } from './fields';

const PRIVACY: { key: keyof Person['privacy']; label: string }[] = [
  { key: 'showPublicly', label: 'Show publicly' },
  { key: 'showPhoto', label: 'Show photo' },
  { key: 'showCompany', label: 'Show company' },
  { key: 'showLinkedin', label: 'Show LinkedIn' },
  { key: 'showEmail', label: 'Show email' },
];

export default function PeopleEditor({ repo }: { repo: string }) {
  return (
    <CollectionEditor<Person>
      repo={repo}
      title="People"
      hint="One reusable record per person — students, officers, advisors, mentors, alumni. Referenced by season rosters, advisor lists, and rocket credits."
      guide={{
        intro: 'A person is created once here, then referenced by season rosters, advisor lists, and rocket credits.',
        steps: [
          'Click “＋ New”, type the full name, and Create.',
          'Add a photo, major, bio, and links.',
          'Use the Privacy checkboxes to choose what shows publicly (e.g. hide their email).',
          'Click Save.',
          'Use the “Sort by” menu to reorder the list by name, graduation year, or alumni — this is just for browsing here; it does not change the public site.',
          'To show them on the team page, add them to a season’s roster in the Seasons tab.',
        ],
      }}
      api={peopleApi}
      newTitleLabel="Full name"
      makeSeed={(id, name) => ({ type: 'person', id, name })}
      displayName={(p) => p.name}
      sort={(a, b) => a.name.localeCompare(b.name)}
      sortModes={[
        { key: 'name', label: 'Name (A–Z)', cmp: (a, b) => a.name.localeCompare(b.name) },
        { key: 'grad', label: 'Graduation year (newest)', cmp: (a, b) => (b.gradYear ?? 0) - (a.gradYear ?? 0) || a.name.localeCompare(b.name) },
        { key: 'alumni', label: 'Alumni first', cmp: (a, b) => Number(b.isAlumni) - Number(a.isAlumni) || a.name.localeCompare(b.name) },
      ]}
      renderItem={(p, update) => (
        <>
          <TextField label="Name" value={p.name} onChange={(v) => update({ name: v })} />
          <ImageField label="Photo" root={repo} value={p.photo} onChange={(src) => update({ photo: src })} aspect={1} />
          <div className="grid2">
            <TextField label="Major / department" value={p.major} onChange={(v) => update({ major: v })} />
            <Field label="Graduation year (blank for faculty/mentor)">
              <input
                type="number"
                value={p.gradYear ?? ''}
                onChange={(e) => update({ gradYear: e.target.value ? Number(e.target.value) : null })}
              />
            </Field>
          </div>
          <TextArea label="Bio" value={p.bio} onChange={(v) => update({ bio: v })} />
          <div className="grid2">
            <TextField label="Email" value={p.links.email} onChange={(v) => update({ links: { ...p.links, email: v } })} />
            <TextField label="LinkedIn" value={p.links.linkedin} onChange={(v) => update({ links: { ...p.links, linkedin: v } })} />
            <TextField label="GitHub" value={p.links.github} onChange={(v) => update({ links: { ...p.links, github: v } })} />
            <TextField label="Website" value={p.links.website} onChange={(v) => update({ links: { ...p.links, website: v } })} />
          </div>
          <div className="grid2">
            <Field label="Alumni?">
              <label><input type="checkbox" checked={p.isAlumni} onChange={(e) => update({ isAlumni: e.target.checked })} /> Graduated alumnus</label>
            </Field>
            <TextField label="Company / next step (alumni)" value={p.company} onChange={(v) => update({ company: v })} />
          </div>
          <Field label="Privacy (consent-based)">
            <div className="checkboxes">
              {PRIVACY.map(({ key, label }) => (
                <label key={key}>
                  <input type="checkbox" checked={p.privacy[key]} onChange={(e) => update({ privacy: { ...p.privacy, [key]: e.target.checked } })} /> {label}
                </label>
              ))}
            </div>
          </Field>
          <CustomFieldsEditor
            label="Custom fields (extra links / info shown on their profile)"
            items={p.customFields}
            onChange={(customFields) => update({ customFields })}
          />
        </>
      )}
    />
  );
}
