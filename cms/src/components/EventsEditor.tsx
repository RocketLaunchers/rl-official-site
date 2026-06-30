import { eventsApi, importPublicImage, type EventItem } from '../api';
import CollectionEditor from './CollectionEditor';
import { Field, ImageField, StringListEditor, Switch, TextArea, TextField } from './fields';

const CATEGORIES = ['competition', 'launch', 'meeting', 'outreach', 'social', 'other'];

export default function EventsEditor({ repo }: { repo: string }) {
  return (
    <CollectionEditor<EventItem>
      repo={repo}
      title="Events"
      hint="Competitions, launches, meetings, and outreach. Each event belongs to a season."
      guide={{
        intro: 'Each event belongs to a season. You can also feature an event on the homepage as an announcement.',
        steps: [
          'Click “＋ New”, type the event title, and Create.',
          'Set the Season id, Category, Date, Location, and Description.',
          'If it already happened, add a placement/result and any awards.',
          'To put it on the homepage: turn on “Feature as a homepage announcement”, add a flyer, and optionally a CTA.',
          'Click Save, then Publish.',
        ],
      }}
      api={eventsApi}
      newTitleLabel="Event title"
      makeSeed={(id, title) => ({ type: 'event', id, title })}
      displayName={(e) => e.title}
      sort={(a, b) => (b.date ?? '').localeCompare(a.date ?? '')}
      renderItem={(e, update) => (
        <>
          <TextField label="Title" value={e.title} onChange={(v) => update({ title: v })} />
          <div className="grid2">
            <TextField label="Season id" value={e.season} placeholder="2025-2026" onChange={(v) => update({ season: v })} />
            <Field label="Category">
              <select value={e.category} onChange={(ev) => update({ category: ev.target.value as EventItem['category'] })}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <TextField label="Date (YYYY-MM-DD)" value={e.date ?? ''} placeholder="2026-06-15" onChange={(v) => update({ date: v || undefined })} />
            <TextField label="Display date" value={e.displayDate} placeholder="June 15–20, 2026" onChange={(v) => update({ displayDate: v })} />
          </div>
          <TextField label="Location" value={e.location} onChange={(v) => update({ location: v })} />
          <TextArea label="Description" value={e.description} onChange={(v) => update({ description: v })} />
          <ImageField label="Logo (optional)" root={repo} value={e.logo} onChange={(src) => update({ logo: src })} onImport={() => importPublicImage(repo)} />
          <TextField label="Placement / result" value={e.placement} placeholder="2nd Place — 10,000 ft COTS" onChange={(v) => update({ placement: v })} />
          <StringListEditor label="Awards" items={e.awards ?? []} onChange={(awards) => update({ awards })} placeholder="Best Technical Report" />
          <Field label="Announcement">
            <Switch label="Feature as a homepage announcement" checked={!!e.featured} onChange={(v) => update({ featured: v })} />
          </Field>
          <ImageField label="Flyer (for the announcement)" root={repo} value={e.flyer} onChange={(src) => update({ flyer: src })} onImport={() => importPublicImage(repo)} />
          <div className="grid2">
            <TextField label="CTA label" value={e.ctaLabel} placeholder="RSVP" onChange={(v) => update({ ctaLabel: v })} />
            <TextField label="CTA link" value={e.ctaHref} placeholder="#join, /events, or https://…" onChange={(v) => update({ ctaHref: v })} />
          </div>
        </>
      )}
    />
  );
}
