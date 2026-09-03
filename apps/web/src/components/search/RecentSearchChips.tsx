'use client';

import { Clock } from 'lucide-react';

export function RecentSearchChips({
  queries,
  onSelect,
  onClear,
}: {
  queries: string[];
  onSelect: (query: string) => void;
  onClear: () => void;
}) {
  if (queries.length === 0) return null;

  return (
    <div className="mb-5">
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ink-400 dark:text-ink-500">
          <Clock className="h-3.5 w-3.5" /> Recent searches
        </p>
        <button
          type="button"
          onClick={onClear}
          className="text-xs font-semibold text-ink-400 hover:text-ink-600 dark:text-ink-500 dark:hover:text-ink-300"
        >
          Clear
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {queries.map((query) => (
          <button
            key={query}
            type="button"
            onClick={() => onSelect(query)}
            className="group inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
          >
            {query}
          </button>
        ))}
      </div>
    </div>
  );
}
