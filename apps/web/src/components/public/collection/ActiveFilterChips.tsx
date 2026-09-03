'use client';

import { X } from 'lucide-react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { buildQueryString } from './urlParams';

export type ActiveChip = { keys: string[]; label: string };

// Shows the currently-applied filters (derived by the page from its own
// searchParams + field labels) as removable chips. Removing a chip clears
// just that filter's param(s) from the URL.
export function ActiveFilterChips({ chips }: { chips: ActiveChip[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (!chips.length) return null;

  function remove(keys: string[]) {
    const updates: Record<string, null> = {};
    keys.forEach((k) => (updates[k] = null));
    const qs = buildQueryString(searchParams, updates);
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function clearAll() {
    router.push(pathname);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <button
          key={chip.keys.join('-')}
          type="button"
          onClick={() => remove(chip.keys)}
          className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-100"
        >
          {chip.label}
          <X className="h-3 w-3" />
        </button>
      ))}
      <button
        type="button"
        onClick={clearAll}
        className="text-xs font-semibold text-ink-500 underline-offset-2 hover:text-ink-700 hover:underline"
      >
        Clear all
      </button>
    </div>
  );
}
