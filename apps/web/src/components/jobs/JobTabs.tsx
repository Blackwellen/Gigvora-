'use client';

import Link from 'next/link';
import { cn } from '@/lib/cn';

export type JobTabKey = 'overview' | 'applicants' | 'analytics';

const TAB_CONFIG: Array<{ key: JobTabKey; label: string; href: (jobId: string) => string }> = [
  { key: 'overview', label: 'Overview', href: (id) => `/app/job-detail?jobId=${id}` },
  { key: 'applicants', label: 'Applicants', href: (id) => `/app/job-applicants?jobId=${id}` },
  { key: 'analytics', label: 'Analytics', href: (id) => `/app/job-analytics?jobId=${id}` },
];

/**
 * Route-based job sub-navigation shared by the three job-scoped Domain 16
 * pages (job-detail, job-applicants, job-analytics) — mirrors ProjectTabs.
 * job-applicants' own page body is owned by a different agent; this only
 * wires the tab link so navigation between the three stays coherent.
 */
export function JobTabs({ jobId, active, counts = {} }: { jobId: string; active: JobTabKey; counts?: Partial<Record<JobTabKey, number>> }) {
  return (
    <div role="tablist" aria-label="Job sections" className="flex items-center gap-1 overflow-x-auto border-b border-ink-100 dark:border-ink-800">
      {TAB_CONFIG.map((tab) => {
        const isActive = tab.key === active;
        const count = counts[tab.key];
        return (
          <Link
            key={tab.key}
            href={tab.href(jobId)}
            role="tab"
            aria-selected={isActive}
            className={cn(
              'relative flex shrink-0 items-center gap-1 whitespace-nowrap px-3.5 py-2.5 font-display text-sm font-semibold tracking-[-0.01em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
              isActive ? 'text-brand-700 dark:text-brand-400' : 'text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-ink-100'
            )}
          >
            {tab.label}
            {typeof count === 'number' && <span className="ml-1 text-xs font-bold text-ink-400 dark:text-ink-500">{count}</span>}
            {isActive && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand-600" />}
          </Link>
        );
      })}
    </div>
  );
}
