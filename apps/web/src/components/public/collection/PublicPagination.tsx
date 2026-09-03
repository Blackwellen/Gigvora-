import Link from 'next/link';
import { buildQueryString } from './urlParams';

// Prev/Next pager driven by `meta.total` vs. items already loaded + the
// offset/limit URL params. Server-safe (plain links, no client JS needed).
export function PublicPagination({
  basePath,
  searchParams,
  total,
  limit,
  offset,
  itemCount,
}: {
  basePath: string;
  searchParams: URLSearchParams;
  total: number;
  limit: number;
  offset: number;
  itemCount: number;
}) {
  if (total <= limit && itemCount <= limit) return null;

  const hasPrev = offset > 0;
  const hasNext = offset + itemCount < total;
  const prevOffset = Math.max(0, offset - limit);
  const nextOffset = offset + limit;

  const rangeStart = total === 0 ? 0 : offset + 1;
  const rangeEnd = Math.min(offset + itemCount, total);

  return (
    <div className="flex items-center justify-between gap-4 border-t border-ink-100 pt-4">
      <p className="text-xs text-ink-500">
        Showing <span className="font-semibold text-ink-700">{rangeStart}-{rangeEnd}</span> of{' '}
        <span className="font-semibold text-ink-700">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        {hasPrev ? (
          <Link
            href={`${basePath}?${buildQueryString(searchParams, { offset: prevOffset === 0 ? null : String(prevOffset) })}`}
            className="rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50"
          >
            Previous
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className="cursor-not-allowed rounded-lg border border-ink-100 px-3 py-1.5 text-xs font-semibold text-ink-300"
          >
            Previous
          </span>
        )}
        {hasNext ? (
          <Link
            href={`${basePath}?${buildQueryString(searchParams, { offset: String(nextOffset) })}`}
            className="rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50"
          >
            Next
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className="cursor-not-allowed rounded-lg border border-ink-100 px-3 py-1.5 text-xs font-semibold text-ink-300"
          >
            Next
          </span>
        )}
      </div>
    </div>
  );
}
