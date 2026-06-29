import { ConstitutionSchema, type Constitution } from '../content/schema';
import { loadCollection } from './_load';

export type { Constitution };

const modules = import.meta.glob('../content/constitution/*.json', { eager: true });

/** Constitution versions newest-first by approval date. */
export const constitutions: Constitution[] = loadCollection(
  modules,
  ConstitutionSchema,
  'constitution',
).sort((a, b) => (b.dateApproved ?? '').localeCompare(a.dateApproved ?? ''));

export const currentConstitution: Constitution | undefined =
  constitutions.find((c) => c.status === 'current') ?? constitutions[0];

export const constitutionForSeason = (seasonId: string): Constitution | undefined =>
  constitutions.find((c) => c.effectiveSeason === seasonId);
