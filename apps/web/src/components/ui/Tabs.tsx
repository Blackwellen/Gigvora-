'use client';

import { cn } from '@/lib/cn';

export function Tabs({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: Array<{ key: string; label: string; count?: number }>;
  value: string;
  onChange: (key: string) => void;
  className?: string;
}) {
  return (
    <div role="tablist" className={cn('flex items-center gap-1 border-b border-ink-100 dark:border-ink-800', className)}>
      {tabs.map((tab) => {
        const active = tab.key === value;
        return (
          <button
            key={tab.key}
            id={`tab-${tab.key}`}
            role="tab"
            type="button"
            aria-selected={active}
            aria-controls={`tabpanel-${tab.key}`}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(tab.key)}
            className={cn(
              'relative flex items-center gap-1.5 px-3.5 py-2.5 font-display text-sm font-semibold tracking-[-0.01em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
              active ? 'text-brand-700 dark:text-brand-400' : 'text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-ink-100'
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={cn('rounded-full px-1.5 text-xs font-bold', active ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-400' : 'bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400')}>
                {tab.count}
              </span>
            )}
            {active && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand-600" />}
          </button>
        );
      })}
    </div>
  );
}
