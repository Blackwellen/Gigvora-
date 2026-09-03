'use client';

import Link from 'next/link';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { ApplicationStatus } from '@/hooks/jobs/types';

export type ApplicationStageKey = 'overview' | 'screening' | 'assessment' | 'interview' | 'offer' | 'hireHandoff';

const STAGE_CONFIG: Array<{ key: ApplicationStageKey; label: string; href: (id: string) => string }> = [
  { key: 'overview', label: 'Applied', href: (id) => `/app/application-detail?applicationId=${id}` },
  { key: 'screening', label: 'Screening', href: (id) => `/app/application-detail?applicationId=${id}` },
  { key: 'assessment', label: 'Assessment', href: (id) => `/app/assessment?applicationId=${id}` },
  { key: 'interview', label: 'Interview', href: (id) => `/app/interview?applicationId=${id}` },
  { key: 'offer', label: 'Offer', href: (id) => `/app/offer?applicationId=${id}` },
  { key: 'hireHandoff', label: 'Hired', href: (id) => `/app/hire-handoff?applicationId=${id}` },
];

/**
 * Maps an application's `status` (the real source of truth — see APPLICATION_STAGE_LABEL
 * in hooks/jobs/types.ts) onto an index into STAGE_CONFIG, so the tracker can mark
 * everything before the current stage "done" and everything after "upcoming".
 */
const STATUS_TO_STAGE_INDEX: Record<ApplicationStatus, number> = {
  submitted: 0,
  reviewing: 1,
  shortlisted: 1,
  interviewing: 3,
  offered: 4,
  hired: 5,
  rejected: -1,
  withdrawn: -1,
};

/**
 * Candidate-journey stage tracker for the application-scoped pages (application-detail,
 * assessment, interview, offer, hire-handoff — screening is job-scoped, so it isn't part
 * of this shell). Adapted from WizardStepper's done/current/pending visual language, but
 * each step is a real route (like ProjectTabs) rather than an in-page wizard step, and
 * rejected/withdrawn render as a distinct terminal state instead of forcing a stage index.
 */
export function ApplicationTabs({
  applicationId,
  status,
  active,
}: {
  applicationId: string;
  status: ApplicationStatus;
  active: ApplicationStageKey;
}) {
  const isTerminalNegative = status === 'rejected' || status === 'withdrawn';
  const currentIndex = STATUS_TO_STAGE_INDEX[status];

  return (
    <div className="space-y-2">
      {isTerminalNegative && (
        <div
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
            status === 'rejected'
              ? 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400'
              : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300'
          )}
        >
          <X className="h-3 w-3" />
          {status === 'rejected' ? 'Application rejected' : 'Application withdrawn'}
        </div>
      )}
      <ol role="tablist" aria-label="Candidate journey stages" className="flex items-center gap-2 overflow-x-auto pb-1">
        {STAGE_CONFIG.map((stage, i) => {
          const state = isTerminalNegative
            ? i < 1
              ? 'done'
              : 'skipped'
            : i < currentIndex
              ? 'done'
              : i === currentIndex
                ? 'current'
                : 'pending';
          const isActive = stage.key === active;

          const icon =
            state === 'done' ? (
              <Check className="h-3.5 w-3.5" />
            ) : state === 'skipped' ? (
              <X className="h-3.5 w-3.5" />
            ) : (
              <span>{i + 1}</span>
            );

          return (
            <li key={stage.key} className="flex flex-1 items-center gap-2 whitespace-nowrap">
              <Link
                href={stage.href(applicationId)}
                role="tab"
                aria-selected={isActive}
                className={cn(
                  'flex items-center gap-2 rounded-full px-2.5 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
                  isActive && 'bg-brand-50 dark:bg-brand-500/10'
                )}
              >
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                    state === 'done'
                      ? 'bg-emerald-500 text-white'
                      : state === 'current'
                        ? 'border-2 border-brand-600 bg-brand-600 text-white'
                        : state === 'skipped'
                          ? 'border-2 border-ink-200 text-ink-300 dark:border-ink-700 dark:text-ink-600'
                          : 'border-2 border-ink-200 text-ink-400 dark:border-ink-700 dark:text-ink-500'
                  )}
                >
                  {icon}
                </span>
                <span
                  className={cn(
                    'font-display text-sm font-semibold tracking-[-0.01em]',
                    isActive
                      ? 'text-brand-700 dark:text-brand-400'
                      : state === 'pending' || state === 'skipped'
                        ? 'text-ink-400 dark:text-ink-500'
                        : 'text-ink-700 dark:text-ink-200'
                  )}
                >
                  {stage.label}
                </span>
              </Link>
              {i < STAGE_CONFIG.length - 1 && (
                <span className={cn('h-px flex-1', state === 'done' ? 'bg-emerald-400' : 'bg-ink-200 dark:bg-ink-700')} />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
