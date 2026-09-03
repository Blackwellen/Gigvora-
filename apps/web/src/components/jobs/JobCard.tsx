'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Bookmark, Briefcase, MapPin, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import type { Job } from '@/hooks/jobs/types';

const WORK_MODE_LABEL: Record<string, string> = { onsite: 'Onsite', remote: 'Remote', hybrid: 'Hybrid' };
const EMPLOYMENT_TYPE_LABEL: Record<string, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contract: 'Contract',
  internship: 'Internship',
  temporary: 'Temporary',
};

function formatSalary(job: Job) {
  if (!job.salary_min && !job.salary_max) return null;
  const currency = job.salary_currency || 'USD';
  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0, notation: 'compact' }).format(n);
  if (job.salary_min && job.salary_max) return `${fmt(job.salary_min)} – ${fmt(job.salary_max)}`;
  return fmt((job.salary_min || job.salary_max) as number);
}

export function JobCard({
  job,
  onSaveToggle,
  saving,
  showMatchScore = true,
  actions,
}: {
  job: Job;
  onSaveToggle?: (job: Job) => void;
  saving?: boolean;
  showMatchScore?: boolean;
  actions?: React.ReactNode;
}) {
  const salary = formatSalary(job);

  return (
    <div className="group rounded-2xl border border-ink-100 bg-white p-4 shadow-surface transition-shadow hover:shadow-floating dark:border-ink-800 dark:bg-ink-900">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-400">
            <Briefcase className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <Link href={`/app/job-detail?jobId=${job.id}`} className="block truncate font-display text-sm font-bold tracking-[-0.01em] text-ink-900 hover:text-brand-700 dark:text-white dark:hover:text-brand-400">
              {job.title}
            </Link>
            <p className="mt-0.5 truncate text-xs text-ink-500 dark:text-ink-400">{job.company_name || 'Confidential company'}</p>
          </div>
        </div>
        {onSaveToggle && (
          <button
            type="button"
            onClick={() => onSaveToggle(job)}
            disabled={saving}
            aria-label={job.is_saved ? 'Unsave job' : 'Save job'}
            className={cn(
              'shrink-0 rounded-full p-1.5 transition-colors',
              job.is_saved ? 'text-brand-600 dark:text-brand-400' : 'text-ink-300 hover:text-ink-600 dark:text-ink-600 dark:hover:text-ink-300'
            )}
          >
            <Bookmark className={cn('h-4.5 w-4.5', job.is_saved && 'fill-current')} />
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {job.location && (
          <span className="flex items-center gap-1 text-xs text-ink-500 dark:text-ink-400">
            <MapPin className="h-3 w-3" /> {job.location}
          </span>
        )}
        <Badge tone="neutral">{WORK_MODE_LABEL[job.work_mode] || job.work_mode}</Badge>
        <Badge tone="neutral">{EMPLOYMENT_TYPE_LABEL[job.employment_type] || job.employment_type}</Badge>
        {job.seniority && <Badge tone="neutral" className="capitalize">{job.seniority}</Badge>}
      </div>

      {job.skills && job.skills.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {job.skills.slice(0, 4).map((skill) => (
            <span key={skill} className="rounded-full bg-ink-50 px-2 py-0.5 text-[11px] font-medium text-ink-500 dark:bg-ink-800/60 dark:text-ink-400">
              {skill}
            </span>
          ))}
          {job.skills.length > 4 && <span className="text-[11px] text-ink-400">+{job.skills.length - 4} more</span>}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          {salary && <p className="text-sm font-bold text-ink-900 dark:text-white">{salary}</p>}
          <p className="text-xs text-ink-400 dark:text-ink-500">
            {job.published_at ? `Posted ${formatDistanceToNow(new Date(job.published_at), { addSuffix: true })}` : job.created_at ? `Posted ${formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}` : ''}
          </p>
        </div>
        {showMatchScore && typeof job.match_score === 'number' && (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-700 dark:bg-purple-500/15 dark:text-purple-400">
            <Sparkles className="h-3 w-3" /> {Math.round(job.match_score)}% match
          </span>
        )}
      </div>

      {job.match_reasons && job.match_reasons.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {job.match_reasons.slice(0, 3).map((reason) => (
            <span key={reason} className="rounded-full bg-purple-50/60 px-2 py-0.5 text-[11px] font-medium text-purple-700 dark:bg-purple-500/10 dark:text-purple-300">
              {reason}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <Link href={`/app/job-detail?jobId=${job.id}`}>
          <Button size="sm" variant="outline">
            View job
          </Button>
        </Link>
        <Link href={`/app/apply/new?jobId=${job.id}`}>
          <Button size="sm">Apply</Button>
        </Link>
        {actions}
      </div>
    </div>
  );
}
