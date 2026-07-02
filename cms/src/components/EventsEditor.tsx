import { useEffect, useState } from 'react';
import { eventsApi, peopleApi, type EventItem, type Person } from '../api';
import type { AnnouncementButton } from '@portfolio/content-schema';
import CollectionEditor from './CollectionEditor';
import { CustomFieldsEditor, Field, ImageField, StringListEditor, Switch, TextArea, TextField } from './fields';

const CATEGORIES = ['competition', 'launch', 'meeting', 'outreach', 'social', 'other'];

/**
 * Marks which members attended an event. Attendance is stored on the event as
 * person ids (like rocket credits) and surfaced on each member's profile card,
 * so it can only reference people who exist in the People catalog. Selected
 * people show as removable chips; the dropdown offers everyone not yet added.
 */
function AttendeesEditor({ people, value, onChange }: { people: Person[]; value: string[]; onChange: (ids: string[]) => void }) {
  const byId = new Map(people.map((p) => [p.id, p]));
  const available = [...people].sort((a, b) => a.name.localeCompare(b.name)).filter((p) => !value.includes(p.id));
  const add = (id: string) => { if (id && !value.includes(id)) onChange([...value, id]); };
  const remove = (id: string) => onChange(value.filter((x) => x !== id));
  return (
    <Field label="Attendees (members who attended — shown on their profile)">
      <div style={{ display: 'grid', gap: 8 }}>
        {value.length > 0 && (
          <div className="token-list">
            {value.map((id) => (
              <span key={id} className={`token${byId.has(id) ? '' : ' missing'}`}>
                {byId.get(id)?.name ?? `${id} (missing)`}
                <button className="token-x" title="Remove" onClick={() => remove(id)}>✕</button>
              </span>
            ))}
          </div>
        )}
        <select
          value=""
          style={{ maxWidth: 320 }}
          disabled={available.length === 0}
          onChange={(ev) => { add(ev.target.value); ev.currentTarget.value = ''; }}
        >
          <option value="">{available.length ? '＋ Add attendee…' : (people.length ? 'Everyone added' : 'No people in the catalog yet')}</option>
          {available.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
    </Field>
  );
}

/** Editable list of announcement CTA buttons (label + link) with add / remove / reorder. */
function AnnouncementButtonsEditor({ buttons, onChange }: { buttons: AnnouncementButton[]; onChange: (b: AnnouncementButton[]) => void }) {
  const set = (i: number, patch: Partial<AnnouncementButton>) => onChange(buttons.map((b, j) => (j === i ? { ...b, ...patch } : b)));
  const remove = (i: number) => onChange(buttons.filter((_, j) => j !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= buttons.length) return;
    const next = [...buttons];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <Field label="Announcement buttons (label + link)">
      <div style={{ display: 'grid', gap: 8 }}>
        {buttons.map((b, i) => (
          <div className="row" key={i}>
            <input value={b.label} placeholder="Button label (e.g. RSVP)" style={{ maxWidth: 200 }} onChange={(e) => set(i, { label: e.target.value })} />
            <input value={b.href} placeholder="#join, /events, or https://…" onChange={(e) => set(i, { href: e.target.value })} />
            <button className="small ghost" title="Move up" onClick={() => move(i, -1)}>↑</button>
            <button className="small ghost" title="Move down" onClick={() => move(i, 1)}>↓</button>
            <button className="small danger" title="Remove" onClick={() => remove(i)}>✕</button>
          </div>
        ))}
        <button className="small ghost" style={{ justifySelf: 'start' }} onClick={() => onChange([...buttons, { label: '', href: '' }])}>＋ Add button</button>
      </div>
    </Field>
  );
}

export default function EventsEditor({ repo }: { repo: string }) {
  const [people, setPeople] = useState<Person[]>([]);
  useEffect(() => { peopleApi.list(repo).then(setPeople).catch(() => setPeople([])); }, [repo]);
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
          'Under Attendees, add the members who came — each event then shows in their profile’s “Events attended”.',
          'To put it on the homepage: turn on “Feature as a homepage announcement”, add a flyer, and optionally one or more buttons (e.g. RSVP, Directions).',
          'Use the search box to find an event, and the “Sort by” menu to reorder the list (by date, season, or category). Events show newest-first on the site regardless.',
          'Click Save, then Publish.',
        ],
      }}
      api={eventsApi}
      newTitleLabel="Event title"
      makeSeed={(id, title) => ({ type: 'event', id, title })}
      displayName={(e) => e.title}
      sort={(a, b) => (b.date ?? '').localeCompare(a.date ?? '')}
      sortModes={[
        { key: 'date-desc', label: 'Date (newest first)', cmp: (a, b) => (b.date ?? '').localeCompare(a.date ?? '') },
        { key: 'date-asc', label: 'Date (oldest first)', cmp: (a, b) => (a.date ?? '').localeCompare(b.date ?? '') },
        { key: 'season', label: 'Season', cmp: (a, b) => (b.season ?? '').localeCompare(a.season ?? '') || (b.date ?? '').localeCompare(a.date ?? '') },
        { key: 'category', label: 'Category', cmp: (a, b) => a.category.localeCompare(b.category) || (b.date ?? '').localeCompare(a.date ?? '') },
        { key: 'title', label: 'Title (A–Z)', cmp: (a, b) => a.title.localeCompare(b.title) },
      ]}
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
          <ImageField label="Logo (optional)" root={repo} value={e.logo} onChange={(src) => update({ logo: src })} />
          <TextField label="Placement / result" value={e.placement} placeholder="2nd Place — 10,000 ft COTS" onChange={(v) => update({ placement: v })} />
          <StringListEditor label="Awards" items={e.awards ?? []} onChange={(awards) => update({ awards })} placeholder="Best Technical Report" />
          <AttendeesEditor people={people} value={e.attendees} onChange={(attendees) => update({ attendees })} />
          <CustomFieldsEditor
            label="Custom fields (extra links / info shown on the event card)"
            items={e.customFields}
            onChange={(customFields) => update({ customFields })}
          />
          <Field label="Announcement">
            <Switch label="Feature as a homepage announcement" checked={!!e.featured} onChange={(v) => update({ featured: v })} />
          </Field>
          <ImageField label="Flyer (for the announcement)" root={repo} value={e.flyer} onChange={(src) => update({ flyer: src })} />
          <AnnouncementButtonsEditor buttons={e.ctaButtons} onChange={(ctaButtons) => update({ ctaButtons })} />
        </>
      )}
    />
  );
}
