import type { CustomField } from '../content/schema';
import { customFieldHref, usableCustomFields } from '../lib/customFields';

/**
 * Renders a record's author-defined custom fields as a simple "label → value"
 * list, auto-linking values that look like URLs/emails. Returns null when there
 * is nothing to show, so callers can render it unconditionally. Callers supply
 * their own surrounding heading; `className` styles the wrapping list.
 */
export default function CustomFields({
  fields,
  className = '',
}: {
  fields: CustomField[] | undefined;
  className?: string;
}) {
  const rows = usableCustomFields(fields);
  if (rows.length === 0) return null;

  return (
    <dl className={className}>
      {rows.map((f, i) => {
        const href = customFieldHref(f.value);
        return (
          <div key={i} className="flex gap-3 py-1.5">
            <dt className="text-ink-faint text-[13px] font-light w-28 sm:w-32 shrink-0">{f.label}</dt>
            <dd className="text-ink-soft text-sm font-light min-w-0 break-words">
              {href ? (
                <a
                  href={href}
                  target={href.startsWith('mailto:') ? undefined : '_blank'}
                  rel="noopener noreferrer"
                  className="text-accent/90 hover:text-ink underline underline-offset-2 decoration-line/30 transition-colors"
                >
                  {f.value}
                </a>
              ) : (
                f.value
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
