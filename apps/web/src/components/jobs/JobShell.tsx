'use client';

import axios from 'axios';
import { Loader2, ShieldAlert } from 'lucide-react';
import { getApiErrorMessage } from '@/lib/api';
import { useJob } from '@/hooks/jobs/useJob';
import { JobHeader } from './JobHeader';
import { JobTabs, type JobTabKey } from './JobTabs';

/**
 * Shared shell for the three job-scoped Domain 16 pages (job-detail,
 * job-applicants, job-analytics) — fetches the job, renders header + tab
 * strip, and gates the body on the same permission check the server already
 * enforces (403 from GET /jobs/:id). Mirrors ProjectShell exactly.
 */
export function JobShell({
  jobId,
  activeTab,
  tabCounts,
  actions,
  children,
}: {
  jobId: string | undefined;
  activeTab: JobTabKey;
  tabCounts?: Partial<Record<JobTabKey, number>>;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { data: job, isLoading, isError, error } = useJob(jobId);

  if (!jobId) {
    return <EmptyState title="No job selected" description="Choose a job from Job Search or Jobs Home to continue." />;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  if (isError) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    const isForbidden = status === 403;
    const isNotFound = status === 404;
    const isTransient = status === 429 || (typeof status === 'number' && status >= 500);
    return (
      <EmptyState
        icon={isForbidden || isTransient ? <ShieldAlert className="h-6 w-6 text-amber-500" /> : undefined}
        title={isForbidden ? "You don't have access to this job" : isNotFound ? 'Job not found' : isTransient ? 'Something went wrong loading this job' : "Couldn't load this job"}
        description={
          isTransient
            ? 'This is likely temporary — please try again in a moment.'
            : getApiErrorMessage(error, "This job doesn't exist or you don't have access to it.")
        }
      />
    );
  }

  if (!job) return null;

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 px-4 py-5 lg:px-6">
      <JobHeader job={job} actions={actions} />
      <JobTabs jobId={jobId} active={activeTab} counts={tabCounts} />
      <div className="pt-2">{children}</div>
    </div>
  );
}

export function EmptyState({ title, description, icon }: { title: string; description: string; icon?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-5 lg:px-6">
      <div className="rounded-2xl border border-dashed border-ink-200 bg-white py-16 text-center dark:border-ink-700 dark:bg-ink-900">
        <div className="mb-2 flex justify-center">{icon}</div>
        <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">{title}</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{description}</p>
      </div>
    </div>
  );
}
