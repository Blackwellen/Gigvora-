import Link from 'next/link';
import { SearchX } from 'lucide-react';

// Honest empty state for zero-result searches/filters. Server-safe (plain
// navigation via Link — no client state needed to "clear filters").
export function PublicEmptyState({
  basePath,
  title = 'No results match your filters',
  description = 'Try widening your search or clearing some filters.',
}: {
  basePath: string;
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-200 bg-ink-50/50 px-6 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-ink-400 shadow-surface">
        <SearchX className="h-6 w-6" strokeWidth={1.5} />
      </span>
      <p className="mt-4 text-sm font-bold text-ink-900">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-ink-500">{description}</p>
      <Link
        href={basePath}
        className="mt-5 rounded-lg border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-800 hover:bg-white"
      >
        Clear filters
      </Link>
    </div>
  );
}
