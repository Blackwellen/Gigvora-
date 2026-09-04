'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { AlertTriangle, FolderKanban, Loader2, Users } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { KpiCard, KpiGrid } from '@/components/ui/KpiCard';
import { useBusinessProjects, type BusinessProjectsFilter } from '@/hooks/business/useBusinessProjects';
import type { BusinessProject, BusinessProjectStatus } from '@/hooks/business/types';
import { getApiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';

const STATUS_TONE: Record<string, 'neutral' | 'brand' | 'warning' | 'success' | 'danger'> = {
  planning: 'neutral',
  active: 'brand',
  on_hold: 'warning',
  completed: 'success',
  cancelled: 'danger',
};

const STATUS_FILTERS: { key: BusinessProjectStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All statuses' },
  { key: 'planning', label: 'Planning' },
  { key: 'active', label: 'Active' },
  { key: 'on_hold', label: 'On hold' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const selectClass =
  'h-9 rounded-lg border border-ink-200 bg-white px-2.5 text-xs font-semibold text-ink-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
}

function isAtRisk(project: BusinessProject) {
  if (project.status === 'completed' || project.status === 'cancelled') return false;
  if (project.budget_utilisation_pct > 100) return true;
  if (!project.target_end_date) return false;
  const daysLeft = (new Date(project.target_end_date).getTime() - Date.now()) / 86400000;
  const totalDuration = project.start_date ? (new Date(project.target_end_date).getTime() - new Date(project.start_date).getTime()) / 86400000 : null;
  if (totalDuration && totalDuration > 0) {
    const expectedProgress = Math.min(100, Math.max(0, ((totalDuration - daysLeft) / totalDuration) * 100));
    return daysLeft >= 0 && expectedProgress - project.progress_pct > 15;
  }
  return daysLeft < 0 && project.progress_pct < 100;
}

function ProjectCard({ project }: { project: BusinessProject }) {
  const atRisk = isAtRisk(project);
  const overBudget = project.budget_utilisation_pct > 100;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink-900 dark:text-white">{project.name}</p>
          <p className="mt-0.5 text-xs capitalize text-ink-400 dark:text-ink-500">{project.project_type}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge tone={STATUS_TONE[project.status] || 'neutral'} className="capitalize">
            {project.status.replace('_', ' ')}
          </Badge>
          {atRisk && (
            <span className="flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400">
              <AlertTriangle className="h-3 w-3" /> At risk
            </span>
          )}
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-ink-500 dark:text-ink-400">
          <span>Progress</span>
          <span>{Math.round(project.progress_pct)}%</span>
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
          <div className="h-full rounded-full bg-brand-600" style={{ width: `${Math.min(100, project.progress_pct)}%` }} />
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-ink-500 dark:text-ink-400">
          <span>
            Budget: {formatCurrency(project.spent)} / {formatCurrency(project.total_budget)}
          </span>
          <span className={overBudget ? 'font-semibold text-red-600 dark:text-red-400' : ''}>{Math.round(project.budget_utilisation_pct)}%</span>
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
          <div
            className={cn('h-full rounded-full', overBudget ? 'bg-red-500' : 'bg-emerald-500')}
            style={{ width: `${Math.min(100, project.budget_utilisation_pct)}%` }}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-ink-500 dark:text-ink-400">
        <span className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5" /> {project.member_count} member{project.member_count === 1 ? '' : 's'}
        </span>
        {project.target_end_date && <span>Due {format(new Date(project.target_end_date), 'MMM d, yyyy')}</span>}
      </div>
    </Card>
  );
}

export default function BusinessProjectsPage() {
  const [status, setStatus] = useState<BusinessProjectStatus | 'all'>('all');
  const filter: BusinessProjectsFilter = useMemo(() => ({ status: status === 'all' ? undefined : status }), [status]);
  const { data, isLoading, isError, error } = useBusinessProjects(filter);
  const projects = data?.data || [];

  const kpis = useMemo(() => {
    const totalBudget = projects.reduce((sum, p) => sum + p.total_budget, 0);
    const avgUtilisation = projects.length ? projects.reduce((sum, p) => sum + p.budget_utilisation_pct, 0) / projects.length : 0;
    const atRiskCount = projects.filter(isAtRisk).length;
    return { totalBudget, avgUtilisation, atRiskCount };
  }, [projects]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-4 py-5 lg:px-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
          <FolderKanban className="h-5 w-5 text-brand-600" /> Projects
        </h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Business portfolio view of internal PM projects — budget, spend, and delivery health across the company.</p>
      </div>

      {!isLoading && !isError && (
        <KpiGrid>
          <KpiCard label="Total projects" value={data?.meta.total ?? projects.length} icon={FolderKanban} tone="brand" />
          <KpiCard label="Total budget" value={formatCurrency(kpis.totalBudget)} />
          <KpiCard label="Avg budget utilisation" value={`${Math.round(kpis.avgUtilisation)}%`} tone={kpis.avgUtilisation > 100 ? 'danger' : 'default'} />
          <KpiCard label="At-risk projects" value={kpis.atRiskCount} tone={kpis.atRiskCount > 0 ? 'danger' : 'success'} icon={AlertTriangle} />
        </KpiGrid>
      )}

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <select value={status} onChange={(e) => setStatus(e.target.value as BusinessProjectStatus | 'all')} aria-label="Filter by status" className={selectClass}>
            {STATUS_FILTERS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      )}

      {isError && (
        <Card className="py-16 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Couldn&rsquo;t load projects</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(error)}</p>
        </Card>
      )}

      {!isLoading && !isError && projects.length === 0 && (
        <Card className="border-dashed py-16 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">No projects match this status</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">Try a different status filter, or check back once internal projects are underway.</p>
        </Card>
      )}

      {!isLoading && !isError && projects.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </div>
  );
}
