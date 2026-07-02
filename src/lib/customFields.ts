import type { CustomField } from '../content/schema';

/**
 * Helpers for author-defined custom fields (label + value) attached to people,
 * sponsors, rockets, events, and constitution versions. Kept separate from the
 * <CustomFields> component so both the component and pages can share them.
 */

/**
 * Turn a custom-field value into an href when it looks like a link. Kept
 * deliberately simple so the field stays flexible: full URLs, protocol-relative
 * and bare `www.` links, and emails become links; anything else stays plain text.
 */
export function customFieldHref(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  if (v.startsWith('//')) return `https:${v}`;
  if (/^www\./i.test(v)) return `https://${v}`;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return `mailto:${v}`;
  return null;
}

/** Fields with both a label and a value — the only ones worth rendering. */
export function usableCustomFields(fields: CustomField[] | undefined): CustomField[] {
  return (fields ?? []).filter((f) => f.label.trim() && f.value.trim());
}
