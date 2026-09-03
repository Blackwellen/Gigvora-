'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import { format } from 'date-fns';
import { ArrowRight, Loader2, Search, ShieldAlert, Users, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { useJob } from '@/hooks/jobs/useJob';
import { useJobApplicants, useUpdateApplicationStatus } from '@/hooks/jobs/useJobApplicants';
import { getApiErrorMessage } from '@/lib/api';
import { APPLICATION_STAGE_LABEL, type Application, type ApplicationStatus, type JobStatus } from '@/hooks/jobs/types';

const STAGE_FILTERS: { key: ApplicationStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All stages' },
  { key: 'submitted', label: 'Applied' },
  { key: 'reviewing', label: 'Screening' },
  { key: 'shortlisted', label: 'Shortlisted' },
  { key: 'interviewing', label: 'Interview' },
  { key: 'offered', label: 'Offer' },
  { key: 'hired', label: 'Hired' },
  { key: 'rejected', label: 'Rejected' },
];

const STAGE_TONE: Record<ApplicationStatus, 'brand' | 'neutral' | 'success' | 'warning' | 'danger'> = {
  submitted: 'neutral',
  reviewing: 'brand',
  shortlisted: 'brand',
  interviewing: 'warning',
  offered: 'success',
  hired: 'success',
  rejected: 'danger',
  withdrawn: 'neutral',
};

const JOB_STATUS_TONE: Record<JobStatus, 'success' | 'neutral' | 'warning' | 'danger'> = {
  draft: 'neutral',
  open: 'success',
  closed: 'warning',
  archived: 'danger',
};

// A stage advances one step along the candidate journey; only forward transitions are offered here
// (rejecting/withdrawing are handled separately) — matches the existing applications.status enum.
const NEXT_STAGE: Partial<Record<ApplicationStatus, ApplicationStatus>> = {
  submitted: 'reviewing',
  reviewing: 'shortlisted',
  shortlisted: 'interviewing',
  interviewing: 'offered',
  offered: 'hired',
};

function candidateName(app: Application) {
  const first = app.candidate?.first_name || '';
  const last = app.candidate?.last_name || '';
  return `${first} ${last}`.trim() || 'Unnamed candidate';
}

function JobApplicantsInner() {
  const router = useRouter();
  const jobId = useSearchParams().get('jobId') || undefined;
  const { data: job, isLoading: jobLoading, isError: jobError, error: jobErrorObj } = useJob(jobId);

  const [stage, setStage] = useState<ApplicationStatus | 'all'>('all');
  const [search, setSearch] = useState('');

  const { data, isLoading, isError, error } = useJobApplicants(jobId, {
    stage: stage === 'all' ? undefined : stage,
    q: search || undefined,
  });
  const updateStatus = useUpdateApplicationStatus(jobId);
  const [actionError, setActionError] = useState<string | null>(null);

  const applicants = useMemo(() => data?.data || [], [data]);

  async function advance(app: Application) {
    const next = NEXT_STAGE[app.status];
    if (!next) return;
    setActionError(null);
    try {
      await updateStatus.mutateAsync({ applicationId: app.id, status: next });
    } catch (err) {
      setActionError(getApiErrorMessage(err));
    }
  }

  async function reject(app: Application) {
    setActionError(null);
    try {
      await updateStatus.mutateAsync({ applicationId: app.id, status: 'rejected' });
    } catch (err) {
      setActionError(getApiErrorMessage(err));
    }
  }

  const columns: DataTableColumn<Application>[] = [
    {
      key: 'candidate',
      header: 'Candidate',
      render: (app) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={candidateName(app)} src={app.candidate?.avatar_url} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink-900 dark:text-white">{candidateName(app)}</p>
            {app.candidate?.headline && <p className="truncate text-xs text-ink-400 dark:text-ink-500">{app.candidate.headline}</p>}
          </div>
        </div>
      ),
    },
    {
      key: 'match_score',
      header: 'Match',
      align: 'center',
      render: (app) =>
        app.match_score != null ? (
          <span className="font-semibold text-ink-900 dark:text-white">{Math.round(app.match_score)}%</span>
        ) : (
          <span className="text-ink-300">—</span>
        ),
    },
    {
      key: 'status',
      header: 'Stage',
      render: (app) => (
        <Badge tone={STAGE_TONE[app.status]}>{APPLICATION_STAGE_LABEL[app.status]}</Badge>
      ),
    },
    {
      key: 'applied_at',
      header: 'Applied',
      render: (app) => (
        <span className="text-ink-500 dark:text-ink-400">
          {app.applied_at || app.created_at ? format(new Date(app.applied_at || app.created_at), 'MMM d, yyyy') : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (app) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          {NEXT_STAGE[app.status] && (
            <Button size="sm" variant="outline" onClick={() => advance(app)} loading={updateStatus.isPending}>
              Advance <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
          {app.status !== 'rejected' && app.status !== 'hired' && app.status !== 'withdrawn' && (
            <Button size="sm" variant="ghost" onClick={() => reject(app)} loading={updateStatus.isPending}>
              <X className="h-3.5 w-3.5" /> Reject
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (!jobId) {
    return (
      <div className="mx-auto max-w-[1200px] px-4 py-16 text-center lg:px-6">
        <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">No job selected</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">Open a job from Jobs Home or Job Search to review its applicants.</p>
      </div>
    );
  }

  if (jobLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  if (jobError) {
    const status = axios.isAxiosError(jobErrorObj) ? jobErrorObj.response?.status : undefined;
    const isForbidden = status === 403;
    const isNotFound = status === 404;
    return (
      <div className="mx-auto max-w-[1200px] px-4 py-16 text-center lg:px-6">
        <div className="mb-2 flex justify-center">{isForbidden && <ShieldAlert className="h-6 w-6 text-amber-500" />}</div>
        <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">
          {isForbidden ? "You don't have access to this job" : isNotFound ? 'Job not found' : "Couldn't load this job"}
        </p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(jobErrorObj, "This job doesn't exist or you don't have access to it.")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-5 px-4 py-5 lg:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <nav className="text-sm text-ink-400 dark:text-ink-500">
            <Link href={`/app/job-detail?jobId=${jobId}`} className="hover:underline">
              {job?.title}
            </Link>{' '}
            / <span className="text-ink-600 dark:text-ink-300">Applicants</span>
          </nav>
          <h1 className="mt-1 flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
            <Users className="h-5 w-5 text-brand-600" /> Applicants
            {job && <Badge tone={JOB_STATUS_TONE[job.status]} className="ml-1 capitalize">{job.status}</Badge>}
          </h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
            {data?.meta?.total ?? applicants.length} applicant{(data?.meta?.total ?? applicants.length) === 1 ? '' : 's'} for {job?.title}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push(`/app/job-analytics?jobId=${jobId}`)}>
            View analytics
          </Button>
          <Button variant="outline" onClick={() => router.push(`/app/screening?jobId=${jobId}`)}>
            Screening queue
          </Button>
        </div>
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by candidate name" className="pl-9" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {STAGE_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setStage(f.key)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  stage === f.key
                    ? 'bg-brand-600 text-white'
                    : 'bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300 dark:hover:bg-ink-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {actionError && <p className="text-sm text-red-600 dark:text-red-400">{actionError}</p>}

      <DataTable
        columns={columns}
        data={applicants}
        rowKey={(app) => app.id}
        isLoading={isLoading}
        onRowClick={(app) => router.push(`/app/application-detail?applicationId=${app.id}`)}
        emptyTitle={search || stage !== 'all' ? 'No applicants match your filters' : 'No applicants yet'}
        emptyDescription={search || stage !== 'all' ? 'Try a different search or stage.' : 'Applicants will show up here as candidates apply to this job.'}
      />

      {isError && (
        <p className="text-sm text-red-600 dark:text-red-400">{getApiErrorMessage(error)}</p>
      )}
    </div>
  );
}

export default function JobApplicantsPage() {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-ink-300" /></div>}>
      <JobApplicantsInner />
    </Suspense>
  );
}
