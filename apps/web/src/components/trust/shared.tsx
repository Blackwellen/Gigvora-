'use client';

import { Loader2, Star, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="font-display text-xl font-bold text-ink-900 dark:text-white">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-ink-500 dark:text-ink-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageContainer({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-[1400px] space-y-5 px-4 py-5 lg:px-6">{children}</div>;
}

export function TwoColumnLayout({ main, rail }: { main: React.ReactNode; rail?: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">{main}</div>
      {rail && <div className="space-y-4">{rail}</div>}
    </div>
  );
}

export function LoadingBlock() {
  return (
    <div className="flex justify-center py-14">
      <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
    </div>
  );
}

export function EmptyState({ title, body, actionLabel, onAction }: { title: string; body: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <div className="rounded-panel border border-dashed border-ink-200 bg-white py-14 text-center dark:border-ink-700 dark:bg-ink-900">
      <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{body}</p>
      {actionLabel && onAction && (
        <Button type="button" size="sm" className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export function AccessDenied() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-20 text-center lg:px-6">
      <ShieldAlert className="mx-auto h-10 w-10 text-ink-300 dark:text-ink-600" />
      <p className="mt-3 font-display text-base font-bold text-ink-900 dark:text-white">You don&apos;t have access to this page</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-ink-500 dark:text-ink-400">
        This is an internal Trust &amp; Safety operations surface, restricted to platform staff.
      </p>
    </div>
  );
}

export function Stars({ value, size = 'sm' }: { value: number; size?: 'sm' | 'md' }) {
  const cls = size === 'md' ? 'h-4.5 w-4.5' : 'h-3.5 w-3.5';
  return (
    <span className="flex items-center gap-0.5" aria-label={`${value.toFixed(1)} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={cn(cls, i < Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-ink-200 dark:text-ink-700')} />
      ))}
    </span>
  );
}

export function StatusPill({ status }: { status: string }) {
  const label = status.replace(/_/g, ' ');
  const tone =
    /verified|published|approved|upheld|active|resolved_actioned/.test(status) ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' :
    /rejected|denied|removed|revoked|critical/.test(status) ? 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400' :
    /processing|submitted|in_review|pending|awaiting/.test(status) ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400' :
    'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300';
  return <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold capitalize', tone)}>{label}</span>;
}
