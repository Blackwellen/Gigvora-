'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { AlertTriangle, Briefcase, Clock, Loader2, Plus, Target, Users } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { KpiCard, KpiGrid } from '@/components/ui/KpiCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { Modal, ModalHeader } from '@/components/ui/Modal';
import {
  useCreateHiringPlan,
  useHiringBottlenecks,
  useHiringOverview,
  useHiringPlans,
  type HiringPlansFilter,
} from '@/hooks/business/useHiring';
import type { HiringPlan, HiringPlanInput, HiringPlanPriority, HiringPlanStatus } from '@/hooks/business/types';
import { getApiErrorMessage } from '@/lib/api';

const PRIORITY_TONE: Record<HiringPlanPriority, 'neutral' | 'brand' | 'warning' | 'danger'> = {
  low: 'neutral',
  medium: 'brand',
  high: 'warning',
  critical: 'danger',
};

const STATUS_TONE: Record<HiringPlanStatus, 'neutral' | 'success' | 'warning' | 'danger' | 'brand'> = {
  draft: 'neutral',
  open: 'brand',
  on_hold: 'warning',
  filled: 'success',
  cancelled: 'danger',
};

const STATUS_FILTERS: { key: HiringPlanStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All statuses' },
  { key: 'open', label: 'Open' },
  { key: 'draft', label: 'Draft' },
  { key: 'on_hold', label: 'On hold' },
  { key: 'filled', label: 'Filled' },
  { key: 'cancelled', label: 'Cancelled' },
];

const PRIORITY_OPTIONS: HiringPlanPriority[] = ['low', 'medium', 'high', 'critical'];
const STATUS_OPTIONS: HiringPlanStatus[] = ['draft', 'open', 'on_hold', 'filled', 'cancelled'];

const selectClass =
  'h-9 rounded-lg border border-ink-200 bg-white px-2.5 text-xs font-semibold text-ink-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200';

export default function HiringPage() {
  const [status, setStatus] = useState<HiringPlanStatus | 'all'>('all');
  const [priority, setPriority] = useState<HiringPlanPriority | 'all'>('all');
  const [createOpen, setCreateOpen] = useState(false);

  const filter: HiringPlansFilter = useMemo(
    () => ({
      status: status === 'all' ? undefined : status,
      priority: priority === 'all' ? undefined : priority,
    }),
    [status, priority]
  );

  const { data: overview, isLoading: overviewLoading } = useHiringOverview();
  const { data: bottlenecks, isLoading: bottlenecksLoading } = useHiringBottlenecks();
  const { data: plansData, isLoading: plansLoading, isError: plansError, error: plansErrorObj } = useHiringPlans(filter);

  const plans = plansData?.data || [];
  const funnel = overview?.funnel || [];
  const maxFunnelCount = Math.max(1, ...funnel.map((f) => f.count));
  const slowestStage = useMemo(() => {
    if (!bottlenecks || bottlenecks.length === 0) return null;
    return bottlenecks.reduce((slowest, b) => (b.avg_days > slowest.avg_days ? b : slowest), bottlenecks[0]);
  }, [bottlenecks]);

  const columns: DataTableColumn<HiringPlan>[] = [
    {
      key: 'role_title',
      header: 'Role',
      render: (p) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink-900 dark:text-white">{p.role_title}</p>
          {p.job_title && <p className="truncate text-xs text-ink-400 dark:text-ink-500">Linked to {p.job_title}</p>}
        </div>
      ),
    },
    {
      key: 'department',
      header: 'Department / Team',
      render: (p) => (
        <span className="text-ink-600 dark:text-ink-300">
          {p.department_name || '—'}
          {p.team_name ? ` / ${p.team_name}` : ''}
        </span>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (p) => (
        <Badge tone={PRIORITY_TONE[p.priority]} className="capitalize">
          {p.priority}
        </Badge>
      ),
    },
    {
      key: 'progress',
      header: 'Target / Filled',
      render: (p) => {
        const pct = p.target_hires > 0 ? Math.min(100, Math.round((p.filled_hires / p.target_hires) * 100)) : 0;
        return (
          <div className="w-32">
            <div className="flex items-center justify-between text-xs text-ink-500 dark:text-ink-400">
              <span>
                {p.filled_hires}/{p.target_hires}
              </span>
              <span>{pct}%</span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
              <div className="h-full rounded-full bg-brand-600" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      },
    },
    {
      key: 'target_date',
      header: 'Target date',
      render: (p) => <span className="text-ink-500 dark:text-ink-400">{p.target_date ? format(new Date(p.target_date), 'MMM d, yyyy') : '—'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) => (
        <Badge tone={STATUS_TONE[p.status]} className="capitalize">
          {p.status.replace('_', ' ')}
        </Badge>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-4 py-5 lg:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
            <Briefcase className="h-5 w-5 text-brand-600" /> Hiring
          </h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Cross-job hiring command centre — requisitions, funnel health, and bottlenecks across every open role.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> New requisition
        </Button>
      </div>

      {overviewLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      ) : overview ? (
        <KpiGrid>
          <KpiCard label="Open roles" value={overview.open_roles} icon={Briefcase} tone="brand" />
          <KpiCard label="Target hires" value={overview.total_target_hires} icon={Target} />
          <KpiCard label="Filled hires" value={overview.total_filled_hires} icon={Users} tone="success" />
          <KpiCard
            label="Avg time to hire"
            value={overview.avg_time_to_hire_days != null ? `${Math.round(overview.avg_time_to_hire_days)}d` : '—'}
            icon={Clock}
            tone="warning"
          />
        </KpiGrid>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <CardHeader title="Hiring funnel" className="px-0 pt-0" />
          <div className="mt-3 space-y-2.5">
            {funnel.length === 0 && <p className="text-sm text-ink-400 dark:text-ink-500">No funnel data yet.</p>}
            {funnel.map((stage) => (
              <div key={stage.stage} className="flex items-center gap-3">
                <span className="w-32 shrink-0 truncate text-xs font-semibold capitalize text-ink-600 dark:text-ink-300">{stage.stage.replace('_', ' ')}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                  <div
                    className="h-full rounded-full bg-brand-600"
                    style={{ width: `${Math.max(4, Math.round((stage.count / maxFunnelCount) * 100))}%` }}
                  />
                </div>
                <span className="w-10 shrink-0 text-right text-xs font-semibold text-ink-700 dark:text-ink-200">{stage.count}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <CardHeader title="Bottlenecks" className="px-0 pt-0" />
          <div className="mt-3 space-y-2">
            {bottlenecksLoading && (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
              </div>
            )}
            {!bottlenecksLoading && (!bottlenecks || bottlenecks.length === 0) && (
              <p className="text-sm text-ink-400 dark:text-ink-500">No bottleneck data yet.</p>
            )}
            {!bottlenecksLoading &&
              bottlenecks?.map((b) => {
                const isSlowest = slowestStage && b.stage === slowestStage.stage;
                return (
                  <div
                    key={b.stage}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                      isSlowest
                        ? 'border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10'
                        : 'border-ink-100 bg-ink-50/60 dark:border-ink-800 dark:bg-ink-800/40'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 font-medium capitalize text-ink-700 dark:text-ink-200">
                      {isSlowest && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
                      {b.stage.replace('_', ' ')}
                    </span>
                    <span className={`font-semibold ${isSlowest ? 'text-red-600 dark:text-red-400' : 'text-ink-600 dark:text-ink-300'}`}>
                      {Math.round(b.avg_days)}d avg
                    </span>
                  </div>
                );
              })}
          </div>
        </Card>
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <select value={status} onChange={(e) => setStatus(e.target.value as HiringPlanStatus | 'all')} aria-label="Filter by status" className={selectClass}>
            {STATUS_FILTERS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
          <select value={priority} onChange={(e) => setPriority(e.target.value as HiringPlanPriority | 'all')} aria-label="Filter by priority" className={selectClass}>
            <option value="all">All priorities</option>
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p} className="capitalize">
                {p}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {plansError && <p className="text-sm text-red-600 dark:text-red-400">{getApiErrorMessage(plansErrorObj)}</p>}

      <DataTable
        columns={columns}
        data={plans}
        rowKey={(p) => p.id}
        isLoading={plansLoading}
        emptyTitle="No requisitions yet"
        emptyDescription="Create a requisition to start tracking a hiring plan against target and filled headcount."
        emptyAction={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New requisition
          </Button>
        }
      />

      <NewRequisitionModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

function NewRequisitionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createPlan = useCreateHiringPlan();
  const [form, setForm] = useState<HiringPlanInput>({ role_title: '', target_hires: 1, priority: 'medium' });
  const [formError, setFormError] = useState<string | null>(null);

  function update(patch: Partial<HiringPlanInput>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.role_title.trim()) return;
    setFormError(null);
    try {
      await createPlan.mutateAsync(form);
      setForm({ role_title: '', target_hires: 1, priority: 'medium' });
      onClose();
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    }
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy="new-requisition-title" className="max-w-md">
      <ModalHeader title="New requisition" onClose={onClose} />
      <form onSubmit={handleSubmit} className="space-y-3 p-5">
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Role title</label>
          <Input data-autofocus value={form.role_title} onChange={(e) => update({ role_title: e.target.value })} placeholder="e.g. Senior Backend Engineer" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Target hires</label>
            <Input
              type="number"
              min={1}
              value={form.target_hires}
              onChange={(e) => update({ target_hires: Number(e.target.value) || 1 })}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Priority</label>
            <select
              value={form.priority}
              onChange={(e) => update({ priority: e.target.value as HiringPlanPriority })}
              className="h-10 w-full rounded-control border border-ink-200 bg-white px-3 text-sm capitalize dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200"
            >
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p} className="capitalize">
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Target date</label>
          <Input type="date" value={form.target_date || ''} onChange={(e) => update({ target_date: e.target.value || undefined })} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Status</label>
          <select
            value={form.status || 'draft'}
            onChange={(e) => update({ status: e.target.value as HiringPlanStatus })}
            className="h-10 w-full rounded-control border border-ink-200 bg-white px-3 text-sm capitalize dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s} className="capitalize">
                {s.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
        <textarea
          value={form.notes || ''}
          onChange={(e) => update({ notes: e.target.value || undefined })}
          rows={2}
          placeholder="Notes (optional)"
          className="w-full rounded-control border border-ink-200 bg-white p-3 text-sm dark:border-ink-700 dark:bg-ink-900 dark:text-white"
        />
        {formError && <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={createPlan.isPending} disabled={!form.role_title.trim()}>
            Create requisition
          </Button>
        </div>
      </form>
    </Modal>
  );
}
