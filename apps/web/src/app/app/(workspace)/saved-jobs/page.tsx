'use client';

import Link from 'next/link';
import { Bookmark, Loader2, Search } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { JobCard } from '@/components/jobs/JobCard';
import { useSavedJobs, useUnsaveJobFromList } from '@/hooks/jobs/useSavedJobs';
import { getApiErrorMessage } from '@/lib/api';
import type { Job } from '@/hooks/jobs/types';

export default function SavedJobsPage() {
  const { data, isLoading, isError, error } = useSavedJobs();
  const unsaveJob = useUnsaveJobFromList();

  const jobs = data?.data || [];

  function handleSaveToggle(job: Job) {
    unsaveJob.mutate(job.id);
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 px-4 py-5 lg:px-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
          <Bookmark className="h-5 w-5 text-brand-600" /> Saved Jobs
        </h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Jobs you&rsquo;ve bookmarked to review or apply to later.</p>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      )}

      {isError && (
        <Card className="py-16 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Couldn&rsquo;t load saved jobs</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(error)}</p>
        </Card>
      )}

      {!isLoading && !isError && jobs.length === 0 && (
        <Card className="border-dashed py-16 text-center">
          <div className="mb-2 flex justify-center">
            <Bookmark className="h-6 w-6 text-ink-300 dark:text-ink-600" />
          </div>
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">No saved jobs yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">Bookmark jobs from Job Search to keep track of roles you&rsquo;re interested in.</p>
          <Link href="/app/job-search" className="mt-4 inline-block">
            <Button size="sm">
              <Search className="h-4 w-4" /> Search jobs
            </Button>
          </Link>
        </Card>
      )}

      {!isLoading && !isError && jobs.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => (
            <JobCard key={job.id} job={{ ...job, is_saved: true }} onSaveToggle={handleSaveToggle} saving={unsaveJob.isPending} />
          ))}
        </div>
      )}
    </div>
  );
}
