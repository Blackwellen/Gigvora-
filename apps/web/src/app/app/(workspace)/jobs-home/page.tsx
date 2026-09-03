'use client';

import Link from 'next/link';
import { Bell, Bookmark, Briefcase, Loader2, Plus, Search, Sparkles, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { KpiCard, KpiGrid } from '@/components/ui/KpiCard';
import { JobCard } from '@/components/jobs/JobCard';
import { useJobs, useSaveJob, useUnsaveJob } from '@/hooks/jobs/useJobs';
import { useRecommendedJobs } from '@/hooks/jobs/useRecommendedJobs';
import { useSavedJobs } from '@/hooks/jobs/useSavedJobs';
import { useJobAlerts } from '@/hooks/jobs/useJobAlerts';
import { getApiErrorMessage } from '@/lib/api';
import type { Job } from '@/hooks/jobs/types';

const QUICK_LINKS = [
  { href: '/app/job-search', label: 'Job Search', icon: Search },
  { href: '/app/saved-jobs', label: 'Saved Jobs', icon: Bookmark },
  { href: '/app/job-alerts', label: 'Job Alerts', icon: Bell },
  { href: '/app/create-job/new', label: 'Create Job', icon: Plus },
];

export default function JobsHomePage() {
  const openRoles = useJobs({ status: 'open', limit: 1 });
  const recommended = useRecommendedJobs(4);
  const trending = useJobs({ sort: 'trending', limit: 6 });
  const saved = useSavedJobs();
  const alerts = useJobAlerts();
  const saveJob = useSaveJob();
  const unsaveJob = useUnsaveJob();

  const activeAlertCount = (alerts.data?.data || []).filter((a) => a.is_active).length;

  const handleSaveToggle = (job: Job) => {
    if (job.is_saved) unsaveJob.mutate(job.id);
    else saveJob.mutate(job.id);
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-4 py-5 lg:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
            <Briefcase className="h-5 w-5 text-brand-600" /> Jobs Marketplace
          </h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Discover roles, track applications, and manage your candidate journey.</p>
        </div>
        <Link href="/app/create-job/new">
          <Button>
            <Plus className="h-4 w-4" /> Post a job
          </Button>
        </Link>
      </div>

      <KpiGrid>
        <KpiCard label="Open roles" value={openRoles.isLoading ? '—' : (openRoles.data?.meta.total ?? 0)} icon={Briefcase} tone="brand" />
        <KpiCard label="Recommended matches" value={recommended.isLoading ? '—' : (recommended.data?.meta.total ?? 0)} icon={Sparkles} tone="default" />
        <KpiCard label="Saved jobs" value={saved.isLoading ? '—' : (saved.data?.meta.total ?? 0)} icon={Bookmark} tone="default" />
        <KpiCard label="Active alerts" value={alerts.isLoading ? '—' : activeAlertCount} icon={Bell} tone="default" />
      </KpiGrid>

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          {QUICK_LINKS.map((link) => (
            <Link key={link.href} href={link.href}>
              <Button variant="outline" size="sm">
                <link.icon className="h-3.5 w-3.5" /> {link.label}
              </Button>
            </Link>
          ))}
        </div>
      </Card>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 font-display text-sm font-bold tracking-[-0.01em] text-ink-900 dark:text-white">
            <Sparkles className="h-4 w-4 text-purple-600" /> Recommended for you
          </h2>
          <Link href="/app/recommended-jobs" className="text-xs font-semibold text-brand-700 hover:underline dark:text-brand-400">
            View all
          </Link>
        </div>

        {recommended.isLoading && (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
          </div>
        )}

        {recommended.isError && (
          <Card className="py-10 text-center">
            <p className="text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(recommended.error, "Couldn't load recommendations right now.")}</p>
          </Card>
        )}

        {!recommended.isLoading && !recommended.isError && (recommended.data?.data.length || 0) === 0 && (
          <Card className="border-dashed py-10 text-center">
            <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">No recommendations yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">Complete your profile skills to get personalized job matches.</p>
          </Card>
        )}

        {!recommended.isLoading && (recommended.data?.data.length || 0) > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {recommended.data!.data.map((job) => (
              <JobCard key={job.id} job={job} onSaveToggle={handleSaveToggle} saving={saveJob.isPending || unsaveJob.isPending} />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 font-display text-sm font-bold tracking-[-0.01em] text-ink-900 dark:text-white">
            <TrendingUp className="h-4 w-4 text-brand-600" /> Trending &amp; recently posted
          </h2>
          <Link href="/app/job-search" className="text-xs font-semibold text-brand-700 hover:underline dark:text-brand-400">
            Browse all
          </Link>
        </div>

        {trending.isLoading && (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
          </div>
        )}

        {trending.isError && (
          <Card className="py-10 text-center">
            <p className="text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(trending.error, "Couldn't load trending jobs right now.")}</p>
          </Card>
        )}

        {!trending.isLoading && !trending.isError && (trending.data?.data.length || 0) === 0 && (
          <Card className="border-dashed py-10 text-center">
            <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">No open roles right now</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">Check back soon, or post a role of your own.</p>
          </Card>
        )}

        {!trending.isLoading && (trending.data?.data.length || 0) > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {trending.data!.data.map((job) => (
              <JobCard key={job.id} job={job} onSaveToggle={handleSaveToggle} saving={saveJob.isPending || unsaveJob.isPending} showMatchScore={false} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
