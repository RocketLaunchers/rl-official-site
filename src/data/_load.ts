import type { ZodType } from 'zod';

/**
 * Shared content-loading helpers used by every collection loader.
 *
 * Each loader passes the result of `import.meta.glob('../content/<dir>/*.json',
 * { eager: true })` (the glob argument must be a literal for Vite) plus the
 * matching Zod schema. Validation is the build-time safety net: a malformed or
 * schema-violating record throws and fails `vite build`, so broken content can
 * never ship. In dev we warn and skip instead of crashing the dev server.
 */

type Glob = Record<string, unknown>;
const defaultOf = (mod: unknown) => (mod as { default: unknown }).default;

export function loadCollection<T>(modules: Glob, schema: ZodType<T>, label: string): T[] {
  const out: T[] = [];
  for (const [path, mod] of Object.entries(modules)) {
    const result = schema.safeParse(defaultOf(mod));
    if (!result.success) {
      const message = `[content] Invalid ${label} "${path}":\n${result.error.message}`;
      if (import.meta.env.PROD) throw new Error(message);
      console.error(message);
      continue;
    }
    out.push(result.data);
  }
  return out;
}

export function loadSingleton<T>(modules: Glob, schema: ZodType<T>, label: string, fallback: T): T {
  for (const mod of Object.values(modules)) {
    const result = schema.safeParse(defaultOf(mod));
    if (result.success) return result.data;
    const message = `[content] Invalid ${label}:\n${result.error.message}`;
    if (import.meta.env.PROD) throw new Error(message);
    console.error(message);
  }
  return fallback;
}
