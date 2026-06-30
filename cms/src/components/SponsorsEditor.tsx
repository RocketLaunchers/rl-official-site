import { sponsorsApi, importPublicImage, type Sponsor } from '../api';
import CollectionEditor from './CollectionEditor';
import { ImageField, TextArea, TextField } from './fields';

export default function SponsorsEditor({ repo }: { repo: string }) {
  return (
    <CollectionEditor<Sponsor>
      repo={repo}
      title="Sponsors"
      hint="Reusable sponsor records. Their per-season support (tier, amount, support type) is set in the Seasons editor."
      guide={{
        intro: 'A sponsor is created once here. Their tier and whether they appear on the homepage is set per-season in the Seasons tab.',
        steps: [
          'Click “＋ New”, type the sponsor name, and Create.',
          'Add their logo, website, industry, and description.',
          'Click Save.',
          'To feature them, open Seasons → current season → Sponsors, add them, and turn on “Show on homepage”.',
        ],
      }}
      api={sponsorsApi}
      newTitleLabel="Sponsor name"
      makeSeed={(id, name) => ({ type: 'sponsor', id, name })}
      displayName={(s) => s.name}
      sort={(a, b) => a.name.localeCompare(b.name)}
      renderItem={(s, update) => (
        <>
          <TextField label="Name" value={s.name} onChange={(v) => update({ name: v })} />
          <ImageField label="Logo" root={repo} value={s.logo} onChange={(src) => update({ logo: src })} onImport={() => importPublicImage(repo)} />
          <div className="grid2">
            <TextField label="Website" value={s.website} placeholder="https://…" onChange={(v) => update({ website: v })} />
            <TextField label="Industry" value={s.industry} onChange={(v) => update({ industry: v })} />
          </div>
          <TextArea label="Description" value={s.description} onChange={(v) => update({ description: v })} />
          <TextField label="Contact (optional, private)" value={s.contact} onChange={(v) => update({ contact: v })} />
        </>
      )}
    />
  );
}
