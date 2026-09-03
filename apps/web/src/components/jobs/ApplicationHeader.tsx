'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { Briefcase } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { APPLICATION_STAGE_LABEL } from '@/hooks/jobs/types';
import type { Application } from '@/hooks/jobs/types';

const STATUS_TONE: Record<string, 'brand' | 'neutral' | 'success' | 'warning' | 'danger'> = {
  submitted: 'neutral',
  reviewing: 'warning',
  shortlisted: 'warning',
  interviewing: 'brand',
  offered: 'brand',
  hired: 'success',
  rejected: 'danger',
  withdrawn: 'neutral',
};

export function ApplicationHeader({ application, actions }: { application: Application; actions?: React.ReactNode }) {
  const candidateName = [application.candidate?.first_name, application.candidate?.last_name].filter(Boolean).join(' ') || 'Candidate';

  return (
    <div className="space-y-3">
      <nav className="text-sm text-ink-400 dark:text-ink-500">
        <Link href={`/app/job-applicants?jobId=${application.job_id}`} className="hover:underline">
          Applicants
        </Link>{' '}
        / <span className="text-ink-600 dark:text-ink-300">{candidateName}</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={candidateName} src={application.candidate?.avatar_url} size="lg" />
          <div>
            <h1 className="text-xl font-bold text-ink-900 dark:text-white">{candidateName}</h1>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-ink-500 dark:text-ink-400">
              <Badge tone={STATUS_TONE[application.status] || 'neutral'}>{APPLICATION_STAGE_LABEL[application.status]}</Badge>
              {application.job?.title && (
                <span className="flex items-center gap-1">
                  <Briefcase className="h-3.5 w-3.5" />
                  <Link href={`/app/job-detail?jobId=${application.job_id}`} className="hover:underline">
                    {application.job.title}
                  </Link>
                </span>
              )}
              {application.candidate?.headline && <span>· {application.candidate.headline}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">{actions}</div>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-2xl border border-ink-100 bg-white p-4 shadow-surface dark:border-ink-800 dark:bg-ink-900 sm:grid-cols-4">
        <Stat label="Match score">
          <span className="text-sm font-semibold text-ink-900 dark:text-white">
            {typeof application.match_score === 'number' ? `${Math.round(application.match_score)}%` : '—'}
          </span>
        </Stat>
        <Stat label="Applied">
          <span className="text-sm font-semibold text-ink-900 dark:text-white">
            {application.applied_at ? format(new Date(application.applied_at), 'MMM d, yyyy') : format(new Date(application.created_at), 'MMM d, yyyy')}
          </span>
        </Stat>
        <Stat label="Source">
          <span className="text-sm font-semibold capitalize text-ink-900 dark:text-white">{application.source || '—'}</span>
        </Stat>
        <Stat label="Email">
          <span className="truncate text-sm font-semibold text-ink-900 dark:text-white">{application.candidate?.email || '—'}</span>
        </Stat>
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
