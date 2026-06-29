import { constitutionApi, importPublicFile, type Constitution } from '../api';
import CollectionEditor from './CollectionEditor';
import { Field, ImageField, StringListEditor, TextField } from './fields';

const STATUSES = ['current', 'archived', 'draft'];

export default function ConstitutionEditor({ repo }: { repo: string }) {
  return (
    <CollectionEditor<Constitution>
      repo={repo}
      title="Constitution"
      hint="Version-controlled governing document. Set exactly one version to “current”. The optional web body is preserved on save (edit it in the JSON file)."
      api={constitutionApi}
      newTitleLabel="Title"
      makeSeed={(id, title) => ({ type: 'constitution', id, title, version: id })}
      displayName={(c) => `${c.title} — v${c.version}`}
      sort={(a, b) => (b.dateApproved ?? '').localeCompare(a.dateApproved ?? '')}
      renderItem={(c, update) => (
        <>
          <div className="grid2">
            <TextField label="Title" value={c.title} onChange={(v) => update({ title: v })} />
            <TextField label="Version" value={c.version} placeholder="2026.1" onChange={(v) => update({ version: v })} />
            <TextField label="Effective season id" value={c.effectiveSeason} placeholder="2025-2026" onChange={(v) => update({ effectiveSeason: v })} />
            <Field label="Status">
              <select value={c.status} onChange={(e) => update({ status: e.target.value as Constitution['status'] })}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <TextField label="Date approved (YYYY-MM-DD)" value={c.dateApproved ?? ''} onChange={(v) => update({ dateApproved: v || undefined })} />
            <TextField label="Display date" value={c.displayDate} placeholder="August 20, 2025" onChange={(v) => update({ displayDate: v })} />
          </div>
          <TextField label="Approved by" value={c.approvedBy} onChange={(v) => update({ approvedBy: v })} />
          <ImageField
            label="PDF"
            root={repo}
            value={c.pdf}
            onChange={(src) => update({ pdf: src })}
            onImport={() => importPublicFile(repo, ['pdf'])}
          />
          <StringListEditor label="Summary of changes" items={c.summaryOfChanges} onChange={(summaryOfChanges) => update({ summaryOfChanges })} placeholder="Added the Director of Engineering role" />
        </>
      )}
    />
  );
}
