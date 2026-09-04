'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, Building2, Loader2, Plus, Trash2, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Drawer } from '@/components/ui/Drawer';
import { Modal, ModalHeader } from '@/components/ui/Modal';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import {
  useArchiveDepartment,
  useCreateDepartment,
  useDepartment,
  useDepartments,
  type DepartmentInput,
} from '@/hooks/business/useDepartments';
import { getApiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';
import type { Department } from '@/hooks/business/types';

const selectClass =
  'h-9 rounded-lg border border-ink-200 bg-white px-2.5 text-xs font-semibold text-ink-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200';

function formatCurrency(amount: number | null, currency: string) {
  if (amount === null) return '—';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

function DepartmentsInner() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('active');
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const fromUrl = searchParams.get('departmentId');
    if (fromUrl) setSelectedId(fromUrl);
  }, [searchParams]);

  const filter = useMemo(() => ({ status: status || undefined }), [status]);
  const { data, isLoading, isError, error } = useDepartments(filter);
  const departments = data?.data || [];

  const columns: DataTableColumn<Department>[] = [
    {
      key: 'name',
      header: 'Department',
      render: (d) => (
        <div>
          <p className="text-sm font-semibold text-ink-800 dark:text-ink-100">{d.name}</p>
          {d.cost_center_code && <p className="text-xs text-ink-400 dark:text-ink-500">{d.cost_center_code}</p>}
        </div>
      ),
    },
    { key: 'head', header: 'Head', render: (d) => <span className="text-sm text-ink-600 dark:text-ink-300">{d.head_name || '—'}</span> },
    {
      key: 'headcount',
      header: 'Headcount',
      render: (d) => {
        const pct = d.headcount_target ? Math.min(100, Math.round((d.member_count / d.headcount_target) * 100)) : null;
        return (
          <div className="min-w-[110px]">
            <p className="text-xs font-semibold text-ink-700 dark:text-ink-200">
              {d.member_count} / {d.headcount_target ?? '—'}
            </p>
            {pct !== null && (
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                <div className={cn('h-full rounded-full', pct >= 100 ? 'bg-emerald-500' : 'bg-brand-600')} style={{ width: `${pct}%` }} />
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'budget',
      header: 'Budget vs spent (YTD)',
      render: (d) => {
        const pct = d.budget_annual ? Math.min(100, Math.round((d.spent_ytd / d.budget_annual) * 100)) : null;
        return (
          <div className="min-w-[150px]">
            <p className="text-xs font-semibold text-ink-700 dark:text-ink-200">
              {formatCurrency(d.spent_ytd, d.currency)} / {formatCurrency(d.budget_annual, d.currency)}
            </p>
            {pct !== null && (
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                <div className={cn('h-full rounded-full', pct > 100 ? 'bg-red-500' : pct > 85 ? 'bg-amber-500' : 'bg-emerald-500')} style={{ width: `${Math.min(100, pct)}%` }} />
              </div>
            )}
          </div>
        );
      },
    },
    { key: 'teams', header: 'Teams', align: 'right', render: (d) => <span className="text-sm font-semibold text-ink-700 dark:text-ink-200">{d.team_count}</span> },
    {
      key: 'status',
      header: 'Status',
      render: (d) => (
        <Badge tone={d.status === 'active' ? 'success' : 'neutral'} className="capitalize">
          {d.status}
        </Badge>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 px-4 py-5 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
            <Building2 className="h-5 w-5" /> Departments
          </h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Budgets, headcount targets and cost centers by department.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> New department
        </Button>
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status" className={selectClass}>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="">All statuses</option>
          </select>
        </div>
      </Card>

      {isError && !isLoading ? (
        <Card className="py-16 text-center">
          <AlertTriangle className="mx-auto h-6 w-6 text-red-500" />
          <p className="mt-2 text-sm font-semibold text-ink-700 dark:text-ink-200">Couldn&rsquo;t load departments</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(error)}</p>
        </Card>
      ) : (
        <DataTable
          columns={columns}
          data={departments}
          rowKey={(d) => d.id}
          isLoading={isLoading}
          onRowClick={(d) => setSelectedId(d.id)}
          emptyTitle="No departments yet"
          emptyDescription="Create a department to track budgets and headcount."
          emptyAction={
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> New department
            </Button>
          }
        />
      )}

      <DepartmentDrawer id={selectedId} onClose={() => setSelectedId(null)} />
      <CreateDepartmentModal open={createOpen} onClose={() => setCreateOpen(false)} departments={departments} />
    </div>
  );
}

function DepartmentDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: dept, isLoading, isError, error } = useDepartment(id || undefined);
  const archiveDepartment = useArchiveDepartment();

  return (
    <Drawer open={Boolean(id)} onClose={onClose} labelledBy="dept-drawer-title" width="w-[460px]">
      <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4 dark:border-ink-800">
        <h2 id="dept-drawer-title" className="font-display text-base font-bold text-ink-900 dark:text-white">
          {dept?.name || 'Department'}
        </h2>
        <button type="button" onClick={onClose} className="rounded-full p-1.5 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800" aria-label="Close" data-autofocus>
          <X className="h-4.5 w-4.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
          </div>
        )}

        {isError && !isLoading && (
          <div className="py-10 text-center">
            <AlertTriangle className="mx-auto h-6 w-6 text-red-500" />
            <p className="mt-2 text-sm font-semibold text-ink-700 dark:text-ink-200">Couldn&rsquo;t load this department</p>
            <p className="mx-auto mt-1 max-w-xs text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(error)}</p>
          </div>
        )}

        {dept && !isLoading && !isError && (
          <div className="space-y-5">
            {dept.description && <p className="text-sm text-ink-600 dark:text-ink-300">{dept.description}</p>}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-ink-400 dark:text-ink-500">Head</p>
                <p className="font-semibold text-ink-800 dark:text-ink-100">{dept.head_name || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-ink-400 dark:text-ink-500">Cost center</p>
                <p className="font-semibold text-ink-800 dark:text-ink-100">{dept.cost_center_code || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-ink-400 dark:text-ink-500">Budget (annual)</p>
                <p className="font-semibold text-ink-800 dark:text-ink-100">{formatCurrency(dept.budget_annual, dept.currency)}</p>
              </div>
              <div>
                <p className="text-xs text-ink-400 dark:text-ink-500">Spent (YTD)</p>
                <p className="font-semibold text-ink-800 dark:text-ink-100">{formatCurrency(dept.spent_ytd, dept.currency)}</p>
              </div>
              <div>
                <p className="text-xs text-ink-400 dark:text-ink-500">Headcount</p>
                <p className="font-semibold text-ink-800 dark:text-ink-100">
                  {dept.member_count} / {dept.headcount_target ?? '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-ink-400 dark:text-ink-500">Teams</p>
                <p className="font-semibold text-ink-800 dark:text-ink-100">{dept.team_count}</p>
              </div>
            </div>

            {dept.child_departments.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-bold text-ink-900 dark:text-white">Child departments</h3>
                <ul className="space-y-1.5">
                  {dept.child_departments.map((child) => (
                    <li key={child.id} className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2 text-sm dark:border-ink-800">
                      <span className="font-semibold text-ink-700 dark:text-ink-200">{child.name}</span>
                      <span className="text-xs text-ink-400 dark:text-ink-500">{child.member_count} members</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <h3 className="mb-2 text-sm font-bold text-ink-900 dark:text-white">Teams ({dept.teams.length})</h3>
              {dept.teams.length === 0 && <p className="text-sm text-ink-400 dark:text-ink-500">No teams in this department yet.</p>}
              <ul className="space-y-1.5">
                {dept.teams.map((team) => (
                  <li key={team.id} className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2 text-sm dark:border-ink-800">
                    <span className="font-semibold text-ink-700 dark:text-ink-200">{team.name}</span>
                    <span className="text-xs text-ink-400 dark:text-ink-500">{team.member_count} members</span>
                  </li>
                ))}
              </ul>
            </div>

            {dept.status !== 'archived' && (
              <div className="border-t border-ink-100 pt-4 dark:border-ink-800">
                <Button
                  variant="danger"
                  size="sm"
                  loading={archiveDepartment.isPending}
                  onClick={() => {
                    if (confirm(`Archive "${dept.name}"?`)) archiveDepartment.mutate(dept.id, { onSuccess: onClose });
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Archive department
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Drawer>
  );
}

function CreateDepartmentModal({ open, onClose, departments }: { open: boolean; onClose: () => void; departments: Department[] }) {
  const createDepartment = useCreateDepartment();
  const [form, setForm] = useState<DepartmentInput>({ name: '', cost_center_code: '', description: '', budget_annual: undefined, currency: 'USD', headcount_target: undefined, parent_department_id: '' });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createDepartment.mutate(
      { ...form, parent_department_id: form.parent_department_id || undefined },
      {
        onSuccess: () => {
          setForm({ name: '', cost_center_code: '', description: '', budget_annual: undefined, currency: 'USD', headcount_target: undefined, parent_department_id: '' });
          onClose();
        },
      }
    );
  }

  return (
    <Modal open={open} onClose={onClose} className="max-w-md" labelledBy="new-dept-title">
      <ModalHeader title="New department" onClose={onClose} />
      <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink-700 dark:text-ink-200">Department name</span>
          <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required data-autofocus />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink-700 dark:text-ink-200">Parent department</span>
          <select
            value={form.parent_department_id || ''}
            onChange={(e) => setForm((f) => ({ ...f, parent_department_id: e.target.value }))}
            className="h-10 w-full rounded-control border border-ink-200 bg-white px-3 text-sm text-ink-900 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
          >
            <option value="">No parent (top-level)</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-ink-700 dark:text-ink-200">Cost center code</span>
            <Input value={form.cost_center_code || ''} onChange={(e) => setForm((f) => ({ ...f, cost_center_code: e.target.value }))} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-ink-700 dark:text-ink-200">Headcount target</span>
            <Input
              type="number"
              min={0}
              value={form.headcount_target ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, headcount_target: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-ink-700 dark:text-ink-200">Annual budget</span>
            <Input
              type="number"
              min={0}
              value={form.budget_annual ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, budget_annual: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-ink-700 dark:text-ink-200">Currency</span>
            <Input value={form.currency || 'USD'} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))} maxLength={3} />
          </label>
        </div>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink-700 dark:text-ink-200">Description</span>
          <Input value={form.description || ''} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </label>
        {createDepartment.isError && <p className="text-sm font-medium text-red-600 dark:text-red-400">{getApiErrorMessage(createDepartment.error)}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={createDepartment.isPending} disabled={!form.name.trim()}>
            Create department
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function DepartmentsPage() {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-ink-300" /></div>}>
      <DepartmentsInner />
    </Suspense>
  );
}
