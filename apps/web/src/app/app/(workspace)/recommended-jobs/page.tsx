'use client';

import Link from 'next/link';
import { Loader2, Search, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { JobCard } from '@/components/jobs/JobCard';
import { useRecommendedJobs } from '@/hooks/jobs/useRecommendedJobs';
import { useSaveJob, useUnsaveJob } from '@/hooks/jobs/useJobs';
import { getApiErrorMessage } from '@/lib/api';
import type { Job } from '@/hooks/jobs/types';

export default function RecommendedJobsPage() {
  const { data, isLoading, isError, error } = useRecommendedJobs();
  const saveJob = useSaveJob();
  const unsaveJob = useUnsaveJob();

  const jobs = data?.data || [];

  function handleSaveToggle(job: Job) {
    if (job.is_saved) unsaveJob.mutate(job.id);
    else saveJob.mutate(job.id);
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 px-4 py-5 lg:px-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
          <Sparkles className="h-5 w-5 text-purple-600" /> Recommended for you
        </h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Jobs ranked by how closely they match your skills and preferences.</p>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      )}

      {isError && (
        <Card className="py-16 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Couldn&rsquo;t load recommendations</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(error)}</p>
        </Card>
      )}

      {!isLoading && !isError && jobs.length === 0 && (
        <Card className="border-dashed py-16 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">No recommendations yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">
            Add skills to your profile and browse a few jobs — we&rsquo;ll start surfacing better matches here.
          </p>
          <Link href="/app/job-search" className="mt-4 inline-block">
            <Button size="sm">
              <Search className="h-4 w-4" /> Browse jobs
            </Button>
          </Link>
        </Card>
      )}

      {!isLoading && !isError && jobs.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} onSaveToggle={handleSaveToggle} saving={saveJob.isPending || unsaveJob.isPending} />
          ))}
        </div>
      )}
    </div>
  );
}
