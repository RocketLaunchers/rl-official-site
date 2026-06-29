import { RoleSchema, type Role } from '../content/schema';
import { loadCollection } from './_load';

export type { Role };

const modules = import.meta.glob('../content/roles/*.json', { eager: true });

export const roles: Role[] = loadCollection(modules, RoleSchema, 'role').sort(
  (a, b) => a.displayOrder - b.displayOrder,
);

export const roleById = (id: string): Role | undefined => roles.find((r) => r.id === id);
