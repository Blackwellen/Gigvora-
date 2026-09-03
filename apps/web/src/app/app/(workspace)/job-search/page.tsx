'use client';

import { useMemo, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { JobCard } from '@/components/jobs/JobCard';
import { useJobs, useSaveJob, useUnsaveJob, type JobsFilter } from '@/hooks/jobs/useJobs';
import { getApiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';
import type { Job } from '@/hooks/jobs/types';

const PAGE_SIZE = 12;

const WORK_MODES = [
  { value: '', label: 'Any work mode' },
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'Onsite' },
];
const EMPLOYMENT_TYPES = [
  { value: '', label: 'Any type' },
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' },
  { value: 'temporary', label: 'Temporary' },
];
const SENIORITIES = [
  { value: '', label: 'Any seniority' },
  { value: 'entry', label: 'Entry' },
  { value: 'mid', label: 'Mid' },
  { value: 'senior', label: 'Senior' },
  { value: 'lead', label: 'Lead' },
  { value: 'principal', label: 'Principal' },
  { value: 'executive', label: 'Executive' },
];
const SORTS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'newest', label: 'Newest' },
  { value: 'salary_desc', label: 'Highest salary' },
];

const selectClass =
  'h-9 rounded-lg border border-ink-200 bg-white px-2.5 text-xs font-semibold text-ink-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200';

type LocalFilters = {
  q: string;
  location: string;
  work_mode: string;
  employment_type: string;
  category: string;
  seniority: string;
  salary_min: string;
  sort: JobsFilter['sort'];
};

const EMPTY_FILTERS: LocalFilters = {
  q: '',
  location: '',
  work_mode: '',
  employment_type: '',
  category: '',
  seniority: '',
  salary_min: '',
  sort: 'relevance',
};

export default function JobSearchPage() {
  const [filters, setFilters] = useState<LocalFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(0);

  const apiFilters: JobsFilter = useMemo(
    () => ({
      status: 'open',
      q: filters.q || undefined,
      location: filters.location || undefined,
      work_mode: (filters.work_mode || undefined) as JobsFilter['work_mode'],
      employment_type: (filters.employment_type || undefined) as JobsFilter['employment_type'],
      category: filters.category || undefined,
      seniority: (filters.seniority || undefined) as JobsFilter['seniority'],
      salary_min: filters.salary_min ? Number(filters.salary_min) : undefined,
      sort: filters.sort,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    }),
    [filters, page]
  );

  const { data, isLoading, isError, error } = useJobs(apiFilters);
  const saveJob = useSaveJob();
  const unsaveJob = useUnsaveJob();

  const jobs = data?.data || [];
  const total = data?.meta.total ?? 0;
  const hasNext = (page + 1) * PAGE_SIZE < total;
  const active = Boolean(filters.location || filters.work_mode || filters.employment_type || filters.category || filters.seniority || filters.salary_min);

  function update(patch: Partial<LocalFilters>) {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(0);
  }

  function handleSaveToggle(job: Job) {
    if (job.is_saved) unsaveJob.mutate(job.id);
    else saveJob.mutate(job.id);
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 px-4 py-5 lg:px-6">
      <div>
        <h1 className="text-xl font-bold text-ink-900 dark:text-white">Job Search</h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Search open roles across the marketplace by keyword, location, and seniority.</p>
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <Input value={filters.q} onChange={(e) => update({ q: e.target.value })} placeholder="Job title, skill, or keyword" className="pl-9" />
          </div>
          <input
            value={filters.location}
            onChange={(e) => update({ location: e.target.value })}
            placeholder="Location"
            aria-label="Filter by location"
            className={cn(selectClass, 'w-36')}
          />
          <select value={filters.work_mode} onChange={(e) => update({ work_mode: e.target.value })} aria-label="Filter by work mode" className={selectClass}>
            {WORK_MODES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select value={filters.employment_type} onChange={(e) => update({ employment_type: e.target.value })} aria-label="Filter by employment type" className={selectClass}>
            {EMPLOYMENT_TYPES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select value={filters.seniority} onChange={(e) => update({ seniority: e.target.value })} aria-label="Filter by seniority" className={selectClass}>
            {SENIORITIES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <input
            value={filters.category}
            onChange={(e) => update({ category: e.target.value })}
            placeholder="Category"
            aria-label="Filter by category"
            className={cn(selectClass, 'w-32')}
          />
          <input
            type="number"
            min={0}
            value={filters.salary_min}
            onChange={(e) => update({ salary_min: e.target.value })}
            placeholder="Min salary"
            aria-label="Minimum salary"
            className={cn(selectClass, 'w-28')}
          />
          <select
            value={filters.sort}
            onChange={(e) => update({ sort: e.target.value as JobsFilter['sort'] })}
            aria-label="Sort jobs"
            className={cn(selectClass, 'ml-auto')}
          >
            {SORTS.map((o) => (
              <option key={o.value} value={o.value}>
                Sort: {o.label}
              </option>
            ))}
          </select>
          {active && (
            <button type="button" onClick={() => update(EMPTY_FILTERS)} className="text-xs font-semibold text-ink-400 hover:text-ink-600 dark:text-ink-500 dark:hover:text-ink-300">
              Reset
            </button>
          )}
        </div>
      </Card>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      )}

      {isError && (
        <Card className="py-16 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Couldn&rsquo;t load jobs</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(error)}</p>
        </Card>
      )}

      {!isLoading && !isError && jobs.length === 0 && (
        <Card className="border-dashed py-16 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">No jobs match your search</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">Try broadening your filters or searching a different keyword.</p>
        </Card>
      )}

      {!isLoading && !isError && jobs.length > 0 && (
        <>
          <p className="text-xs text-ink-400 dark:text-ink-500">{total} open role{total === 1 ? '' : 's'}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} onSaveToggle={handleSaveToggle} saving={saveJob.isPending || unsaveJob.isPending} />
            ))}
          </div>
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
        </>
      )}
    </div>
  );
}
