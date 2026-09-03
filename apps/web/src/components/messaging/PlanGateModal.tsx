'use client';

import type { LucideIcon } from 'lucide-react';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/cn';

export type PlanGateChecklistItem = {
  icon: LucideIcon;
  label: string;
};

/**
 * Shared "feature requires upgrade" centered overlay card — the actual gate rendered on top of a
 * dimmed page (Sales Messages / Enterprise Messages today; any future plan-gated messaging
 * surface can reuse it). This component renders only the modal card itself (`position: fixed`,
 * centered, no backdrop) — the calling page is responsible for dimming/blurring its own
 * background content behind it, since the two reference designs dim genuinely different
 * background compositions (a lead-focused 3-pane vs an account-focused one).
 *
 * The footer area is a render slot rather than a fixed set of buttons: Sales Messages needs two
 * side-by-side plan-comparison cards plus two CTAs, Enterprise Messages needs a simpler 2x2
 * checklist plus two CTAs and a trust microcopy line. Forcing those into one shared button-row
 * shape would fight both designs, so callers own the footer entirely.
 */
export function PlanGateModal({
  icon: Icon = Lock,
  iconWrapperClassName = 'bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400',
  badgeLabel,
  badgeClassName = 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400',
  headline,
  description,
  checklist,
  checklistColumns = 2,
  footer,
  className,
}: {
  icon?: LucideIcon;
  iconWrapperClassName?: string;
  badgeLabel: string;
  badgeClassName?: string;
  headline: string;
  description: string;
  checklist: PlanGateChecklistItem[];
  checklistColumns?: 2 | 3;
  footer: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="plan-gate-headline"
      className={cn(
        'fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-overlay border border-ink-100/80 bg-white p-6 shadow-floating sm:p-8 dark:border-ink-800/80 dark:bg-ink-900',
        className
      )}
    >
      <div className="flex flex-col items-center text-center">
        <span className={cn('flex h-14 w-14 items-center justify-center rounded-full', iconWrapperClassName)}>
          <Icon className="h-7 w-7" />
        </span>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <h2 id="plan-gate-headline" className="font-display text-xl font-bold tracking-[-0.01em] text-ink-900 dark:text-white">
            {headline}
          </h2>
          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide', badgeClassName)}>{badgeLabel}</span>
        </div>
        <p className="mt-2 max-w-md text-sm text-ink-500 dark:text-ink-400">{description}</p>
      </div>

      <ul className={cn('mt-6 grid gap-x-6 gap-y-3', checklistColumns === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
        {checklist.map((item) => (
          <li key={item.label} className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink-50 text-ink-500 dark:bg-ink-800 dark:text-ink-400">
              <item.icon className="h-3.5 w-3.5" />
            </span>
            <span className="text-xs font-medium leading-snug text-ink-700 dark:text-ink-200">{item.label}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6">{footer}</div>
    </div>
  );
}
