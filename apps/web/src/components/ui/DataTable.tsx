'use client';

import { ArrowDown, ArrowUp, ArrowUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  className?: string;
  headerClassName?: string;
}

export interface DataTableSort {
  key: string;
  direction: 'asc' | 'desc';
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  isLoading?: boolean;
  onRowClick?: (row: T) => void;
  sort?: DataTableSort;
  onSortChange?: (key: string) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  className?: string;
}

const ALIGN_CLASS: Record<NonNullable<DataTableColumn<unknown>['align']>, string> = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
};

/**
 * Generic sortable data table primitive in the house style (rounded-2xl
 * card, thin cool-grey borders/dividers). Renders its own loading skeleton
 * and dashed-border empty state so callers don't have to special-case
 * "table with no rows" — the shared EmptyState precedent lives inline here
 * because a table needs the message inside its own card frame.
 */
export function DataTable<T>({
  columns,
  data,
  rowKey,
  isLoading,
  onRowClick,
  sort,
  onSortChange,
  emptyTitle = 'No records yet',
  emptyDescription = 'Nothing to show here yet.',
  emptyAction,
  className,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className={cn('flex justify-center rounded-2xl border border-ink-100 bg-white py-16 dark:border-ink-800 dark:bg-ink-900', className)}>
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={cn('rounded-2xl border border-dashed border-ink-200 bg-white py-16 text-center dark:border-ink-700 dark:bg-ink-900', className)}>
        <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">{emptyTitle}</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{emptyDescription}</p>
        {emptyAction && <div className="mt-4 flex justify-center">{emptyAction}</div>}
      </div>
    );
  }

  return (
    <div className={cn('overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-surface dark:border-ink-800 dark:bg-ink-900', className)}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400 dark:border-ink-800 dark:text-ink-500">
            <tr>
              {columns.map((col) => {
                const isSorted = sort?.key === col.key;
                return (
                  <th key={col.key} className={cn('px-4 py-3 font-medium', ALIGN_CLASS[col.align || 'left'], col.headerClassName)}>
                    {col.sortable && onSortChange ? (
                      <button
                        type="button"
                        onClick={() => onSortChange(col.key)}
                        className="inline-flex items-center gap-1 hover:text-ink-700 dark:hover:text-ink-200"
                      >
                        {col.header}
                        {isSorted ? (
                          sort?.direction === 'asc' ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : (
                            <ArrowDown className="h-3 w-3" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-40" />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  'border-b border-ink-50 last:border-0 dark:border-ink-800/60',
                  onRowClick && 'cursor-pointer hover:bg-ink-50 dark:hover:bg-ink-800/60'
                )}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn('px-4 py-3 align-middle text-ink-600 dark:text-ink-300', ALIGN_CLASS[col.align || 'left'], col.className)}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
