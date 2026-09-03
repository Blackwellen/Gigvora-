import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export type Crumb = { label: string; href?: string };

/** Simple Home / Category / Title breadcrumb trail used across every Domain 02 detail page. */
export function PublicBreadcrumbs({ items }: { items: Crumb[] }) {
  const trail: Crumb[] = [{ label: 'Home', href: '/home' }, ...items];
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs text-ink-500">
      {trail.map((crumb, i) => {
        const isLast = i === trail.length - 1;
        return (
          <span key={`${crumb.label}-${i}`} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-ink-300" />}
            {crumb.href && !isLast ? (
              <Link href={crumb.href} className="hover:text-brand-600">
                {crumb.label}
              </Link>
            ) : (
              <span className={isLast ? 'font-semibold text-ink-800' : ''}>{crumb.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
