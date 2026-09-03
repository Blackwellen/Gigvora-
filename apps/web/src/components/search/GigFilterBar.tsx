'use client';

import { MapPin, SlidersHorizontal } from 'lucide-react';
import type { GigFilters, GigSort } from '@/hooks/useSearch';
import { cn } from '@/lib/cn';

const WORK_MODES: Array<{ value: string; label: string }> = [
  { value: '', label: 'Any work mode' },
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'Onsite' },
];

const SORTS: Array<{ value: GigSort; label: string }> = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'newest', label: 'Newest' },
];

const selectClass =
  'h-9 rounded-lg border border-ink-200 bg-white px-2.5 text-xs font-semibold text-ink-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200';

export function GigFilterBar({ filters, onChange }: { filters: GigFilters; onChange: (next: GigFilters) => void }) {
  const active = Boolean(filters.location || filters.workMode);

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-ink-100 bg-ink-50/60 p-2.5 dark:border-ink-800 dark:bg-ink-900/40">
      <span className="flex items-center gap-1.5 pl-1 text-xs font-bold uppercase tracking-wide text-ink-400 dark:text-ink-500">
        <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
      </span>

      <label className="relative">
        <MapPin className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
        <input
          value={filters.location || ''}
          onChange={(e) => onChange({ ...filters, location: e.target.value })}
          placeholder="Location"
          aria-label="Filter by location"
          className={cn(selectClass, 'w-36 pl-7')}
        />
      </label>

      <select
        value={filters.workMode || ''}
        onChange={(e) => onChange({ ...filters, workMode: e.target.value || undefined })}
        aria-label="Filter by work mode"
        className={selectClass}
      >
        {WORK_MODES.map((mode) => (
          <option key={mode.value} value={mode.value}>
            {mode.label}
          </option>
        ))}
      </select>

      <select
        value={filters.sort || 'relevance'}
        onChange={(e) => onChange({ ...filters, sort: e.target.value as GigSort })}
        aria-label="Sort gigs"
        className={cn(selectClass, 'ml-auto')}
      >
        {SORTS.map((sort) => (
          <option key={sort.value} value={sort.value}>
            Sort: {sort.label}
          </option>
        ))}
      </select>

      {active && (
        <button
          type="button"
          onClick={() => onChange({ sort: filters.sort })}
          className="text-xs font-semibold text-ink-400 hover:text-ink-600 dark:text-ink-500 dark:hover:text-ink-300"
        >
          Reset
        </button>
      )}
    </div>
  );
}
