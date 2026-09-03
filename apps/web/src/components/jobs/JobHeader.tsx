'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { Briefcase, CalendarDays, MapPin, Users } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { Job } from '@/hooks/jobs/types';

const STATUS_TONE: Record<string, 'success' | 'neutral' | 'warning' | 'danger'> = {
  open: 'success',
  draft: 'warning',
  closed: 'neutral',
  archived: 'danger',
};

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

export function JobHeader({ job, actions }: { job: Job; actions?: React.ReactNode }) {
  const salary = formatSalary(job);

  return (
    <div className="space-y-3">
      <nav className="text-sm text-ink-400 dark:text-ink-500">
        <Link href="/app/job-search" className="hover:underline">
          Jobs
        </Link>{' '}
        / <span className="text-ink-600 dark:text-ink-300">{job.title}</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white">
            <Briefcase className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-ink-900 dark:text-white">{job.title}</h1>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-ink-500 dark:text-ink-400">
              <Badge tone={STATUS_TONE[job.status] || 'neutral'} className="capitalize">{job.status}</Badge>
              {job.company_name && <span>· {job.company_name}</span>}
            </div>
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-2xl border border-ink-100 bg-white p-4 shadow-surface dark:border-ink-800 dark:bg-ink-900 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Location">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-ink-900 dark:text-white">
            <MapPin className="h-3.5 w-3.5 text-ink-400" /> {job.location || 'Remote'}
          </span>
        </Stat>
        <Stat label="Work mode">
          <span className="text-sm font-semibold text-ink-900 dark:text-white">{WORK_MODE_LABEL[job.work_mode] || job.work_mode}</span>
        </Stat>
        <Stat label="Employment">
          <span className="text-sm font-semibold text-ink-900 dark:text-white">{EMPLOYMENT_TYPE_LABEL[job.employment_type] || job.employment_type}</span>
        </Stat>
        <Stat label="Salary">
          <span className="text-sm font-semibold text-ink-900 dark:text-white">{salary || 'Not disclosed'}</span>
        </Stat>
        {typeof job.applicant_count === 'number' ? (
          <Stat label="Applicants">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-ink-900 dark:text-white">
              <Users className="h-3.5 w-3.5 text-ink-400" /> {job.applicant_count}
            </span>
          </Stat>
        ) : (
          <Stat label="Deadline">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-ink-900 dark:text-white">
              <CalendarDays className="h-3.5 w-3.5 text-ink-400" />
              {job.application_deadline ? format(new Date(job.application_deadline), 'MMM d, yyyy') : 'Open until filled'}
            </span>
          </Stat>
        )}
      </div>
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-400 dark:text-ink-500">{label}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}
