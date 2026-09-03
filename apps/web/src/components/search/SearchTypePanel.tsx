'use client';

import { AlertTriangle, Loader2, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useSearchByType, type GigFilters, type ResultOf, type SearchEntityType } from '@/hooks/useSearch';

function RowSkeleton() {
  return (
    <div className="flex animate-pulse items-center gap-3 rounded-xl border border-ink-100 bg-white p-3 dark:border-ink-800 dark:bg-ink-900">
      <div className="h-10 w-10 shrink-0 rounded-lg bg-ink-100 dark:bg-ink-800" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-3.5 w-1/3 rounded bg-ink-100 dark:bg-ink-800" />
        <div className="h-3 w-1/2 rounded bg-ink-100 dark:bg-ink-800" />
      </div>
    </div>
  );
}

export function SearchTypePanel<T extends SearchEntityType>({
  type,
  q,
  filters,
  entityLabel,
  renderItem,
}: {
  type: T;
  q: string;
  filters?: GigFilters;
  entityLabel: string;
  renderItem: (item: ResultOf<T>) => React.ReactNode;
}) {
  const { data, isLoading, isError, error, refetch, isFetching, isFetchingNextPage, hasNextPage, fetchNextPage } = useSearchByType(
    type,
    q,
    filters
  );

  const items = data?.pages.flatMap((page) => page.items) ?? [];

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <RowSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-red-200 bg-red-50/40 py-16 text-center dark:border-red-500/30 dark:bg-red-500/5">
        <AlertTriangle className="h-6 w-6 text-red-500" />
        <div>
          <p className="text-sm font-semibold text-ink-800 dark:text-ink-100">Couldn&rsquo;t load {entityLabel.toLowerCase()}</p>
          <p className="mt-1 max-w-sm text-xs text-ink-500 dark:text-ink-400">
            {error instanceof Error ? error.message : 'Something went wrong while fetching results.'}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-ink-200 bg-white py-16 text-center dark:border-ink-700 dark:bg-ink-900">
        <SearchX className="h-6 w-6 text-ink-300 dark:text-ink-600" />
        <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">No {entityLabel.toLowerCase()} match &ldquo;{q}&rdquo;</p>
        <p className="max-w-sm text-xs text-ink-400 dark:text-ink-500">Try a different search term{filters ? ' or clearing your filters' : ''}.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-2">{items.map((item) => renderItem(item))}</div>

      {hasNextPage && (
        <div className="flex justify-center py-4">
          <Button type="button" variant="outline" size="sm" loading={isFetchingNextPage} onClick={() => fetchNextPage()}>
            Load more
          </Button>
        </div>
      )}

      {!hasNextPage && items.length > 0 && !isFetching && (
        <p className="py-4 text-center text-xs text-ink-400 dark:text-ink-500">That&rsquo;s everyone we found.</p>
      )}
    </div>
  );
}
