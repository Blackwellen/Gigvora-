'use client';

import { useCountries } from '@/hooks/useTaxonomies';
import { cn } from '@/lib/cn';

/**
 * Canonical country picker backed by GET /taxonomies/countries
 * (apps/api/src/common/taxonomies/countries.js) — the single shared list,
 * grouped by region. Use this instead of a free-text "location" input
 * anywhere a real country is being captured.
 */
export function CountrySelect({
  value,
  onChange,
  allowEmpty = true,
  emptyLabel = 'Any country',
  className,
  id,
}: {
  value: string | null | undefined;
  onChange: (code: string | null) => void;
  allowEmpty?: boolean;
  emptyLabel?: string;
  className?: string;
  id?: string;
}) {
  const { data: countries, isLoading } = useCountries();

  const byRegion = new Map<string, typeof countries>();
  for (const c of countries || []) {
    if (!byRegion.has(c.region)) byRegion.set(c.region, []);
    byRegion.get(c.region)!.push(c);
  }

  return (
    <select
      id={id}
      value={value || ''}
      disabled={isLoading}
      onChange={(e) => onChange(e.target.value || null)}
      className={cn(
        'h-10 w-full rounded-control border border-ink-200 bg-white px-3 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-900 dark:text-white',
        className
      )}
    >
      {allowEmpty && <option value="">{isLoading ? 'Loading countries...' : emptyLabel}</option>}
      {[...byRegion.entries()].map(([region, list]) => (
        <optgroup key={region} label={region}>
          {list!.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
