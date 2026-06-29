import { PersonSchema, type Person } from '../content/schema';
import { loadCollection } from './_load';

export type { Person };

const modules = import.meta.glob('../content/people/*.json', { eager: true });

export const people: Person[] = loadCollection(modules, PersonSchema, 'person').sort((a, b) =>
  a.name.localeCompare(b.name),
);

export const personById = (id: string): Person | undefined => people.find((p) => p.id === id);
