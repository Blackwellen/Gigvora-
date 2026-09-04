'use client';

import { useState } from 'react';
import { ChevronDown, Sparkles } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { CrmNextBestAction } from '@/hooks/crm/types';

const ACTION_LABEL: Record<string, string> = {
  add_stakeholder: 'Add a stakeholder',
  schedule_followup: 'Schedule a follow-up',
  define_next_step: 'Define next step',
  work_lead: 'Work this lead',
  none: 'On track',
};

/**
 * Right-rail "next best action" card — read-time-only suggestion from
 * ai.service.js#suggestNextBestAction (not persisted to crm_ml_predictions,
 * so there's no score/id to fetch: the caller computes/derives it, e.g. from
 * the record + recent activity, and passes it straight in). Purple accent
 * per the house AI visual language, used sparingly.
 */
export function NextBestActionCard({ action }: { action: CrmNextBestAction | null | undefined }) {
  const [expanded, setExpanded] = useState(false);
  if (!action) return null;

  const isNone = action.action === 'none';

  return (
    <div
      className={cn(
        'rounded-2xl border p-4',
        isNone ? 'border-ink-100 bg-white dark:border-ink-800 dark:bg-ink-900' : 'border-purple-200 bg-purple-50 dark:border-purple-500/30 dark:bg-purple-500/10'
      )}
    >
      <div className="flex items-center gap-2">
        <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg', isNone ? 'bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400' : 'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400')}>
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        <p className={cn('text-sm font-bold', isNone ? 'text-ink-700 dark:text-ink-200' : 'text-purple-800 dark:text-purple-300')}>
          {ACTION_LABEL[action.action] || action.action}
        </p>
      </div>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="mt-2 flex w-full items-center justify-between text-left text-xs text-ink-500 dark:text-ink-400"
      >
        <span className={expanded ? '' : 'line-clamp-1'}>{action.reason}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 transition-transform', expanded && 'rotate-180')} />
      </button>
    </div>
  );
}
