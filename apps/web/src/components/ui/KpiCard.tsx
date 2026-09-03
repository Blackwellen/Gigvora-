import type { LucideIcon } from 'lucide-react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/cn';

type Tone = 'default' | 'brand' | 'success' | 'warning' | 'danger';

const VALUE_TONES: Record<Tone, string> = {
  default: 'text-ink-900 dark:text-white',
  brand: 'text-brand-700 dark:text-brand-400',
  success: 'text-emerald-600 dark:text-emerald-400',
  warning: 'text-amber-600 dark:text-amber-400',
  danger: 'text-red-600 dark:text-red-400',
};

const ICON_TONES: Record<Tone, string> = {
  default: 'bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400',
  brand: 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400',
  success: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
  warning: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',
  danger: 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400',
};

export interface KpiCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  tone?: Tone;
  hint?: string;
  delta?: { value: string; direction: 'up' | 'down' | 'flat' };
  className?: string;
}

/**
 * Small stat tile used across analytics/KPI-strip surfaces (mirrors the
 * inline `Kpi` component in project-analytics/page.tsx, generalized into a
 * shared primitive since Domain 16 needs several KPI grids across pages).
 */
export function KpiCard({ label, value, icon: Icon, tone = 'default', hint, delta, className }: KpiCardProps) {
  return (
    <div className={cn('rounded-2xl border border-ink-100 bg-white p-4 shadow-surface dark:border-ink-800 dark:bg-ink-900', className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-400 dark:text-ink-500">{label}</p>
        {Icon && (
          <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', ICON_TONES[tone])}>
            <Icon className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <p className={cn('text-2xl font-bold', VALUE_TONES[tone])}>{value}</p>
        {delta && (
          <span
            className={cn(
              'flex items-center gap-0.5 text-xs font-semibold',
              delta.direction === 'up' ? 'text-emerald-600 dark:text-emerald-400' : delta.direction === 'down' ? 'text-red-600 dark:text-red-400' : 'text-ink-400'
            )}
          >
            {delta.direction === 'up' && <TrendingUp className="h-3 w-3" />}
            {delta.direction === 'down' && <TrendingDown className="h-3 w-3" />}
            {delta.value}
          </span>
        )}
      </div>
      {hint && <p className="mt-1 text-xs text-ink-400 dark:text-ink-500">{hint}</p>}
    </div>
  );
}

export function KpiGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4', className)}>{children}</div>;
}
