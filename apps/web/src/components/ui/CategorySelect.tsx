'use client';

import { useProjectCategories } from '@/hooks/useTaxonomies';
import { cn } from '@/lib/cn';

/**
 * Canonical project-category picker backed by GET /taxonomies/project-categories
 * (apps/api/src/common/taxonomies/projectCategories.js) — replaces the
 * unconstrained free-text `category` string every marketplace-style domain
 * used before this taxonomy existed.
 */
export function CategorySelect({
  value,
  onChange,
  allowEmpty = true,
  emptyLabel = 'Any category',
  className,
  id,
}: {
  value: string | null | undefined;
  onChange: (category: string | null) => void;
  allowEmpty?: boolean;
  emptyLabel?: string;
  className?: string;
  id?: string;
}) {
  const { data, isLoading } = useProjectCategories();

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
      {allowEmpty && <option value="">{isLoading ? 'Loading categories...' : emptyLabel}</option>}
      {(data?.groups || []).map((g) => (
        <optgroup key={g.group} label={g.group}>
          {g.categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
