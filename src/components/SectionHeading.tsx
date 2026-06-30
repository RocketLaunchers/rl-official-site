import { Link } from 'react-router-dom';

/**
 * The repeated section header used across the site: a light tracked title, a
 * thin rule, and an optional "view all" link on the right.
 */
export default function SectionHeading({
  title,
  to,
  linkLabel = 'View all',
}: {
  title: string;
  to?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-center gap-6 mb-14">
      <h2 className="font-display text-3xl md:text-4xl font-light tracking-[0.12em] text-ink whitespace-nowrap">
        {title}
      </h2>
      <div className="h-px flex-1 bg-line/10" />
      {to && (
        <Link
          to={to}
          className="text-ink-muted hover:text-ink transition-colors text-xs tracking-[0.15em] uppercase font-light whitespace-nowrap"
        >
          {linkLabel} →
        </Link>
      )}
    </div>
  );
}
