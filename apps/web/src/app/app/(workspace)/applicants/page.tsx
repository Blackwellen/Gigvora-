'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowUpRight, Loader2, Search, Users, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { KpiCard, KpiGrid } from '@/components/ui/KpiCard';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { Drawer } from '@/components/ui/Drawer';
import { useBusinessApplicant, useBusinessApplicants, useBusinessApplicantsSummary, type BusinessApplicantsFilter } from '@/hooks/business/useBusinessApplicants';
import { useJobs } from '@/hooks/jobs/useJobs';
import { APPLICATION_STAGE_LABEL, type ApplicationStatus } from '@/hooks/jobs/types';
import type { BusinessApplicant } from '@/hooks/business/types';
import { getApiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';

const PAGE_SIZE = 20;

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

const selectClass =
  'h-9 rounded-lg border border-ink-200 bg-white px-2.5 text-xs font-semibold text-ink-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200';

function ApplicantDetailDrawer({ applicationId, onClose }: { applicationId: string | null; onClose: () => void }) {
  const { data: app, isLoading, isError, error } = useBusinessApplicant(applicationId || undefined);

  return (
    <Drawer open={Boolean(applicationId)} onClose={onClose} labelledBy="applicant-drawer-title">
      <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4 dark:border-ink-800">
        <h2 id="applicant-drawer-title" className="font-display text-base font-bold text-ink-900 dark:text-white">
          Applicant detail
        </h2>
        <button type="button" onClick={onClose} className="rounded-full p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-800 dark:hover:text-ink-100" aria-label="Close">
          <X className="h-4.5 w-4.5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-5">
        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
          </div>
        )}
        {isError && <p className="text-sm text-red-600 dark:text-red-400">{getApiErrorMessage(error)}</p>}
        {app && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <Avatar name={app.applicant_name} src={app.applicant_avatar_url} size="lg" />
              <div className="min-w-0">
                <p className="truncate text-base font-bold text-ink-900 dark:text-white">{app.applicant_name}</p>
                {app.applicant_headline && <p className="truncate text-sm text-ink-500 dark:text-ink-400">{app.applicant_headline}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">Job</p>
                <p className="mt-1 truncate text-sm font-semibold text-ink-900 dark:text-white">{app.job_title}</p>
              </Card>
              <Card className="p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">Stage</p>
                <Badge tone={STAGE_TONE[app.status]} className="mt-1">{APPLICATION_STAGE_LABEL[app.status]}</Badge>
              </Card>
              <Card className="p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">Match score</p>
                <p className="mt-1 text-sm font-semibold text-ink-900 dark:text-white">{app.match_score != null ? `${Math.round(app.match_score)}%` : '—'}</p>
              </Card>
              <Card className="p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">Applied</p>
                <p className="mt-1 text-sm font-semibold text-ink-900 dark:text-white">{format(new Date(app.applied_at), 'MMM d, yyyy')}</p>
              </Card>
            </div>
            {app.cover_letter && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">Cover letter</p>
                <p className="text-sm text-ink-600 dark:text-ink-300">{app.cover_letter}</p>
              </div>
            )}
            <Link
              href={`/app/job-applicants?jobId=${app.job_id}`}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:border-ink-300 hover:bg-ink-50 dark:border-ink-700 dark:text-ink-200 dark:hover:bg-ink-800"
            >
              Open in per-job applicant management <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </div>
    </Drawer>
  );
}

export default function ApplicantsPage() {
  const [jobId, setJobId] = useState('all');
  const [status, setStatus] = useState<ApplicationStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: jobsData } = useJobs({ limit: 100 });
  const jobs = jobsData?.data || [];

  const { data: summary, isLoading: summaryLoading } = useBusinessApplicantsSummary();

  const filter: BusinessApplicantsFilter = useMemo(
    () => ({
      job_id: jobId === 'all' ? undefined : jobId,
      status: status === 'all' ? undefined : status,
      q: search || undefined,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    }),
    [jobId, status, search, page]
  );

  const { data, isLoading, isError, error } = useBusinessApplicants(filter);
  const applicants = data?.data || [];
  const total = data?.meta.total ?? 0;
  const hasNext = (page + 1) * PAGE_SIZE < total;

  const byStatus = new Map((summary?.by_status || []).map((s) => [s.status, s.count]));

  const columns: DataTableColumn<BusinessApplicant>[] = [
    {
      key: 'applicant',
      header: 'Applicant',
      render: (a) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={a.applicant_name} src={a.applicant_avatar_url} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink-900 dark:text-white">{a.applicant_name}</p>
            {a.applicant_headline && <p className="truncate text-xs text-ink-400 dark:text-ink-500">{a.applicant_headline}</p>}
          </div>
        </div>
      ),
    },
    { key: 'job_title', header: 'Job', render: (a) => <span className="text-ink-600 dark:text-ink-300">{a.job_title}</span> },
    {
      key: 'status',
      header: 'Stage',
      render: (a) => <Badge tone={STAGE_TONE[a.status]}>{APPLICATION_STAGE_LABEL[a.status]}</Badge>,
    },
    {
      key: 'match_score',
      header: 'Match',
      align: 'center',
      render: (a) => (a.match_score != null ? <span className="font-semibold text-ink-900 dark:text-white">{Math.round(a.match_score)}%</span> : <span className="text-ink-300">—</span>),
    },
    {
      key: 'applied_at',
      header: 'Applied',
      render: (a) => <span className="text-ink-500 dark:text-ink-400">{format(new Date(a.applied_at), 'MMM d, yyyy')}</span>,
    },
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-4 py-5 lg:px-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
          <Users className="h-5 w-5 text-brand-600" /> Applicants
        </h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Business-wide view of applicants across every open job. Deep candidate actions live on the per-job applicants screen.</p>
      </div>

      {summaryLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      ) : (
        <KpiGrid>
          <KpiCard label="Total applicants" value={summary?.total ?? 0} icon={Users} tone="brand" />
          <KpiCard label="Screening" value={(byStatus.get('reviewing') || 0) + (byStatus.get('shortlisted') || 0)} />
          <KpiCard label="Interviewing" value={byStatus.get('interviewing') || 0} tone="warning" />
          <KpiCard label="Hired" value={byStatus.get('hired') || 0} tone="success" />
        </KpiGrid>
      )}

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Search by applicant name"
              className="pl-9"
            />
          </div>
          <select
            value={jobId}
            onChange={(e) => {
              setJobId(e.target.value);
              setPage(0);
            }}
            aria-label="Filter by job"
            className={cn(selectClass, 'max-w-[220px]')}
          >
            <option value="all">All jobs</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as ApplicationStatus | 'all');
              setPage(0);
            }}
            aria-label="Filter by stage"
            className={selectClass}
          >
            {STAGE_FILTERS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {isError && <p className="text-sm text-red-600 dark:text-red-400">{getApiErrorMessage(error)}</p>}

      <DataTable
        columns={columns}
        data={applicants}
        rowKey={(a) => a.id}
        isLoading={isLoading}
        onRowClick={(a) => setSelectedId(a.id)}
        emptyTitle={search || status !== 'all' || jobId !== 'all' ? 'No applicants match your filters' : 'No applicants yet'}
        emptyDescription={search || status !== 'all' || jobId !== 'all' ? 'Try a different search, job, or stage.' : 'Applicants will show up here as candidates apply across your jobs.'}
      />

      {!isLoading && !isError && applicants.length > 0 && (
        <div className="flex items-center justify-between pt-1">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            Previous
          </Button>
          <span className="text-xs text-ink-400 dark:text-ink-500">
            Page {page + 1} of {Math.max(1, Math.ceil(total / PAGE_SIZE))}
          </span>
          <Button variant="outline" size="sm" disabled={!hasNext} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}

      <ApplicantDetailDrawer applicationId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}
