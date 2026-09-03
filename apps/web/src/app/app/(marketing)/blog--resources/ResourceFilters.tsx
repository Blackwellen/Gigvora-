'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { cn } from '@/lib/cn';
import { CONTENT_TYPE_TABS } from './lib';

export function ResourceFilters({ activeType, initialQuery }: { activeType: string; initialQuery: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);

  function pushParams(next: { type?: string; q?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.type !== undefined) {
      if (next.type === 'all') params.delete('type');
      else params.set('type', next.type);
    }
    if (next.q !== undefined) {
      if (!next.q) params.delete('q');
      else params.set('q', next.q);
    }
    const qs = params.toString();
    router.push(qs ? `/app/blog--resources?${qs}` : '/app/blog--resources');
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-1.5">
        {CONTENT_TYPE_TABS.map((tab) => {
          const active = activeType === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => pushParams({ type: tab.key })}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                active ? 'bg-brand-600 text-white' : 'border border-ink-200 text-ink-600 hover:bg-ink-50'
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          pushParams({ q: query.trim() });
        }}
        className="relative w-full sm:w-64"
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search articles, guides, topics..."
          className="w-full rounded-lg border border-ink-200 py-2 pl-9 pr-3 text-sm text-ink-900 outline-none placeholder:text-ink-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
        />
      </form>
    </div>
  );
}
