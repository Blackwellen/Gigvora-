'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { buildQueryString } from './urlParams';

export type FilterOption = { value: string; label: string };

export type FilterField =
  | { type: 'select'; key: string; label: string; options: FilterOption[]; placeholder?: string }
  | { type: 'checkboxList'; key: string; label: string; options: FilterOption[] }
  | { type: 'numberRange'; label: string; minKey: string; maxKey: string; minPlaceholder?: string; maxPlaceholder?: string }
  | { type: 'toggle'; key: string; label: string; onValue: string }
  | { type: 'text'; key: string; label: string; placeholder?: string; helperText?: string };

// Generic left-sidebar filter panel driven by a config of fields, so each
// collection page declares only the params its backend endpoint actually
// accepts (never a filter that looks functional but does nothing server-side).
// Every change writes straight into the URL query string.
export function PublicFilterPanel({ fields, title = 'Filters' }: { fields: FilterField[]; title?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Local buffer only for free-text/number inputs so keystrokes don't thrash
  // the URL; committed on blur/Enter. Selects/checkboxes/toggles commit instantly.
  const [buffer, setBuffer] = useState<Record<string, string>>({});

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const field of fields) {
      if (field.type === 'numberRange') {
        next[field.minKey] = searchParams.get(field.minKey) ?? '';
        next[field.maxKey] = searchParams.get(field.maxKey) ?? '';
      } else if (field.type === 'text') {
        next[field.key] = searchParams.get(field.key) ?? '';
      }
    }
    setBuffer(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  function commit(updates: Record<string, string | null>) {
    const qs = buildQueryString(searchParams, updates);
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <aside className="w-full shrink-0 rounded-2xl border border-ink-100 bg-white p-5 shadow-surface lg:w-64">
      <h3 className="text-sm font-bold text-ink-900">{title}</h3>
      <div className="mt-4 space-y-5">
        {fields.map((field) => {
          if (field.type === 'select') {
            const current = searchParams.get(field.key) ?? '';
            return (
              <div key={field.key}>
                <label className="mb-1.5 block text-xs font-semibold text-ink-700">{field.label}</label>
                <select
                  value={current}
                  onChange={(e) => commit({ [field.key]: e.target.value || null })}
                  className="h-9 w-full rounded-lg border border-ink-200 bg-white px-2.5 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  <option value="">{field.placeholder ?? 'Any'}</option>
                  {field.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            );
          }

          if (field.type === 'checkboxList') {
            const current = searchParams.get(field.key) ?? '';
            return (
              <div key={field.key}>
                <p className="mb-1.5 text-xs font-semibold text-ink-700">{field.label}</p>
                <div className="space-y-1.5">
                  {field.options.map((opt) => {
                    const checked = current === opt.value;
                    return (
                      <label key={opt.value} className="flex cursor-pointer items-center gap-2 text-sm text-ink-700">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => commit({ [field.key]: checked ? null : opt.value })}
                          className="h-3.5 w-3.5 rounded border-ink-300 text-brand-600 focus:ring-brand-500/30"
                        />
                        {opt.label}
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          }

          if (field.type === 'numberRange') {
            return (
              <div key={field.minKey}>
                <label className="mb-1.5 block text-xs font-semibold text-ink-700">{field.label}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={buffer[field.minKey] ?? ''}
                    placeholder={field.minPlaceholder ?? 'Min'}
                    onChange={(e) => setBuffer((b) => ({ ...b, [field.minKey]: e.target.value }))}
                    onBlur={() => commit({ [field.minKey]: buffer[field.minKey] || null })}
                    onKeyDown={(e) => e.key === 'Enter' && commit({ [field.minKey]: buffer[field.minKey] || null })}
                    className="h-9 w-full rounded-lg border border-ink-200 bg-white px-2.5 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                  <span className="text-xs text-ink-400">to</span>
                  <input
                    type="number"
                    value={buffer[field.maxKey] ?? ''}
                    placeholder={field.maxPlaceholder ?? 'Max'}
                    onChange={(e) => setBuffer((b) => ({ ...b, [field.maxKey]: e.target.value }))}
                    onBlur={() => commit({ [field.maxKey]: buffer[field.maxKey] || null })}
                    onKeyDown={(e) => e.key === 'Enter' && commit({ [field.maxKey]: buffer[field.maxKey] || null })}
                    className="h-9 w-full rounded-lg border border-ink-200 bg-white px-2.5 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>
              </div>
            );
          }

          if (field.type === 'toggle') {
            const active = searchParams.get(field.key) === field.onValue;
            return (
              <label key={field.key} className="flex cursor-pointer items-center justify-between text-sm text-ink-700">
                <span className="font-semibold text-ink-700">{field.label}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={active}
                  onClick={() => commit({ [field.key]: active ? null : field.onValue })}
                  className={cn(
                    'relative h-5 w-9 rounded-full transition-colors',
                    active ? 'bg-brand-600' : 'bg-ink-200'
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
                      active ? 'translate-x-4' : 'translate-x-0.5'
                    )}
                  />
                </button>
              </label>
            );
          }

          // text (free-text list, e.g. comma-separated skills)
          return (
            <div key={field.key}>
              <label className="mb-1.5 block text-xs font-semibold text-ink-700">{field.label}</label>
              <input
                type="text"
                value={buffer[field.key] ?? ''}
                placeholder={field.placeholder}
                onChange={(e) => setBuffer((b) => ({ ...b, [field.key]: e.target.value }))}
                onBlur={() => commit({ [field.key]: buffer[field.key] || null })}
                onKeyDown={(e) => e.key === 'Enter' && commit({ [field.key]: buffer[field.key] || null })}
                className="h-9 w-full rounded-lg border border-ink-200 bg-white px-2.5 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
              {field.helperText && <p className="mt-1 text-[11px] text-ink-500">{field.helperText}</p>}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
