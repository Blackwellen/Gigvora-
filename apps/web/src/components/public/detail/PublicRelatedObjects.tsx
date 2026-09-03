import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';

export type RelatedItem = { title: string; subtitle?: string; href: string };

/** Generic "similar jobs / similar gigs / up next" rail — a plain list of links, shared across detail pages. */
export function PublicRelatedObjects({ title, items }: { title: string; items: RelatedItem[] }) {
  if (items.length === 0) return null;
  return (
    <Card>
      <CardHeader title={title} />
      <ul className="divide-y divide-ink-100 px-2 pb-2 pt-2">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="group flex items-start justify-between gap-3 rounded-xl px-3 py-2.5 hover:bg-ink-50"
            >
              <span>
                <span className="block text-sm font-semibold text-ink-900 group-hover:text-brand-700">{item.title}</span>
                {item.subtitle && <span className="mt-0.5 block text-xs text-ink-500">{item.subtitle}</span>}
              </span>
              <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-ink-300 group-hover:text-brand-600" />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
