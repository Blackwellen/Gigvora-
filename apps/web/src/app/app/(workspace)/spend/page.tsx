'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Plus, TriangleAlert, Wallet } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { KpiCard, KpiGrid } from '@/components/ui/KpiCard';
import { Modal, ModalHeader } from '@/components/ui/Modal';
import { Tabs } from '@/components/ui/Tabs';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import {
  useCreateSpendBudget,
  useLogSpend,
  useSpendBudgets,
  useSpendList,
  useSpendSummary,
  type SpendInput,
} from '@/hooks/business/useSpend';
import { useDepartments } from '@/hooks/business/useDepartments';
import { getApiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';
import type { SpendBudget, SpendItem } from '@/hooks/business/types';

const selectClass =
  'h-9 rounded-lg border border-ink-200 bg-white px-2.5 text-xs font-semibold text-ink-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200';

const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  approved: 'success',
  pending: 'warning',
  rejected: 'danger',
};

function formatCurrency(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

const TABS = [
  { key: 'transactions', label: 'Transactions' },
  { key: 'budgets', label: 'Budgets' },
];

export default function SpendPage() {
  const [tab, setTab] = useState('transactions');
  const [logOpen, setLogOpen] = useState(false);
  const { data: summary, isLoading: summaryLoading, isError: summaryError } = useSpendSummary();

  const maxCategory = summary ? Math.max(1, ...summary.by_category.map((c) => c.total)) : 1;
  const maxTrend = summary ? Math.max(1, ...summary.monthly_trend.map((m) => m.total)) : 1;
  const currency = 'USD';

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 px-4 py-5 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
            <Wallet className="h-5 w-5" /> Spend
          </h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Track spend, budgets and anomalies across departments and teams.</p>
        </div>
        <Button onClick={() => setLogOpen(true)}>
          <Plus className="h-4 w-4" /> Log spend
        </Button>
      </div>

      {summaryLoading && (
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-ink-100 dark:bg-ink-800" />
          ))}
        </div>
      )}

      {summaryError && !summaryLoading && (
        <Card className="py-8 text-center">
          <p className="text-sm text-ink-400 dark:text-ink-500">Spend summary is temporarily unavailable.</p>
        </Card>
      )}

      {summary && !summaryLoading && (
        <>
          <KpiGrid className="sm:grid-cols-3 lg:grid-cols-3">
            <KpiCard label="Spend MTD" value={formatCurrency(summary.total_mtd, currency)} icon={Wallet} tone="brand" />
            <KpiCard label="Flagged spend" value={formatCurrency(summary.total_flagged, currency)} icon={TriangleAlert} tone={summary.total_flagged > 0 ? 'danger' : 'default'} />
            <KpiCard label="Anomalies" value={summary.anomaly_count} icon={AlertTriangle} tone={summary.anomaly_count > 0 ? 'warning' : 'success'} />
          </KpiGrid>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Spend by category" />
              <div className="space-y-2 px-5 py-4">
                {summary.by_category.length === 0 && <p className="text-sm text-ink-400 dark:text-ink-500">No categorised spend yet.</p>}
                {summary.by_category.map((c) => {
                  const pct = Math.max(4, Math.round((c.total / maxCategory) * 100));
                  return (
                    <div key={c.category}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-semibold capitalize text-ink-600 dark:text-ink-300">{c.category.replace(/_/g, ' ')}</span>
                        <span className="font-bold text-ink-900 dark:text-white">{formatCurrency(c.total, currency)}</span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                        <div className="h-full rounded-full bg-brand-600" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card>
              <CardHeader title="Monthly trend" />
              <div className="px-5 py-4">
                {summary.monthly_trend.length === 0 ? (
                  <p className="text-sm text-ink-400 dark:text-ink-500">No spend history yet.</p>
                ) : (
                  <div className="flex h-32 items-end gap-2">
                    {summary.monthly_trend.map((m) => {
                      const heightPct = Math.max(4, Math.round((m.total / maxTrend) * 100));
                      return (
                        <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                          <div className="flex w-full flex-1 items-end">
                            <div
                              className="w-full rounded-t-md bg-purple-500"
                              style={{ height: `${heightPct}%` }}
                              title={`${m.month}: ${formatCurrency(m.total, currency)}`}
                            />
                          </div>
                          <span className="text-[10px] text-ink-400 dark:text-ink-500">{m.month.slice(5)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </>
      )}

      <Tabs tabs={TABS} value={tab} onChange={setTab} />

      {tab === 'transactions' && <TransactionsTab />}
      {tab === 'budgets' && <BudgetsTab />}

      <LogSpendModal open={logOpen} onClose={() => setLogOpen(false)} />
    </div>
  );
}

function TransactionsTab() {
  const [category, setCategory] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [status, setStatus] = useState('');
  const [offset, setOffset] = useState(0);
  const PAGE_SIZE = 20;

  const { data: deptData } = useDepartments({ status: 'active' });
  const departments = deptData?.data || [];

  const filter = useMemo(
    () => ({ category: category || undefined, department_id: departmentId || undefined, status: status || undefined, limit: PAGE_SIZE, offset }),
    [category, departmentId, status, offset]
  );
  const { data, isLoading, isError, error } = useSpendList(filter);
  const rows = data?.data || [];
  const total = data?.meta.total ?? 0;

  const columns: DataTableColumn<SpendItem>[] = [
    {
      key: 'description',
      header: 'Transaction',
      render: (s) => (
        <div>
          <p className="text-sm font-semibold text-ink-800 dark:text-ink-100">{s.description}</p>
          <p className="text-xs text-ink-400 dark:text-ink-500">{s.vendor || 'No vendor'} · {new Date(s.spend_date).toLocaleDateString()}</p>
        </div>
      ),
    },
    { key: 'category', header: 'Category', render: (s) => <Badge tone="neutral" className="capitalize">{s.category.replace(/_/g, ' ')}</Badge> },
    { key: 'scope', header: 'Department / Team', render: (s) => <span className="text-sm text-ink-600 dark:text-ink-300">{s.team_name || s.department_name || '—'}</span> },
    { key: 'amount', header: 'Amount', align: 'right', render: (s) => <span className="text-sm font-bold text-ink-900 dark:text-white">{formatCurrency(s.amount, s.currency)}</span> },
    {
      key: 'status',
      header: 'Status',
      render: (s) => (
        <div className="flex items-center gap-1.5">
          <Badge tone={STATUS_TONE[s.status] || 'neutral'} className="capitalize">
            {s.status}
          </Badge>
          {s.is_anomaly && (
            <span title={s.anomaly_reason || 'Flagged as anomaly'}>
              <TriangleAlert className="h-3.5 w-3.5 text-red-500" />
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category" className="max-w-[160px]" />
          <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} aria-label="Filter by department" className={selectClass}>
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status" className={selectClass}>
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          {!isLoading && !isError && <span className="ml-auto text-xs text-ink-400 dark:text-ink-500">{total} transaction{total === 1 ? '' : 's'}</span>}
        </div>
      </Card>

      {isError && !isLoading ? (
        <Card className="py-16 text-center">
          <AlertTriangle className="mx-auto h-6 w-6 text-red-500" />
          <p className="mt-2 text-sm font-semibold text-ink-700 dark:text-ink-200">Couldn&rsquo;t load spend</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(error)}</p>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-ink-100 dark:border-ink-800">
          {rows.some((r) => r.is_anomaly) && !isLoading ? (
            <div className="divide-y divide-ink-50 bg-white dark:divide-ink-800/60 dark:bg-ink-900">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400 dark:border-ink-800 dark:text-ink-500">
                  <tr>
                    {columns.map((c) => (
                      <th key={c.key} className="px-4 py-3 font-medium">
                        {c.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      className={cn(
                        'border-b border-ink-50 last:border-0 dark:border-ink-800/60',
                        row.is_anomaly && 'border-l-4 border-l-red-500 bg-red-50/40 dark:bg-red-500/5'
                      )}
                    >
                      {columns.map((c) => (
                        <td key={c.key} className="px-4 py-3 align-middle">
                          {c.render(row)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={rows}
              rowKey={(s) => s.id}
              isLoading={isLoading}
              emptyTitle="No spend logged yet"
              emptyDescription="Log a transaction to start tracking spend."
              className="border-0"
            />
          )}
        </div>
      )}

      {!isLoading && !isError && total > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}>
            Previous
          </Button>
          <span className="text-xs text-ink-400 dark:text-ink-500">
            {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
          </span>
          <Button variant="outline" size="sm" disabled={offset + PAGE_SIZE >= total} onClick={() => setOffset((o) => o + PAGE_SIZE)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

function BudgetsTab() {
  const { data, isLoading, isError, error } = useSpendBudgets();
  const budgets = data?.data || [];
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-500 dark:text-ink-400">Budgets allocated per department, team and category for the current period.</p>
        <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> New budget
        </Button>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-ink-100 dark:bg-ink-800" />
          ))}
        </div>
      )}

      {isError && !isLoading && (
        <Card className="py-16 text-center">
          <AlertTriangle className="mx-auto h-6 w-6 text-red-500" />
          <p className="mt-2 text-sm font-semibold text-ink-700 dark:text-ink-200">Couldn&rsquo;t load budgets</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(error)}</p>
        </Card>
      )}

      {!isLoading && !isError && budgets.length === 0 && (
        <Card className="border-dashed py-16 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">No budgets set for this period</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">Allocate a budget to track utilisation against spend.</p>
        </Card>
      )}

      {!isLoading && !isError && budgets.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {budgets.map((b) => (
            <BudgetCard key={b.id} budget={b} />
          ))}
        </div>
      )}

      <CreateBudgetModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

function BudgetCard({ budget }: { budget: SpendBudget }) {
  const overBudget = budget.utilisation_pct > 100;
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold capitalize text-ink-900 dark:text-white">{budget.category.replace(/_/g, ' ')}</p>
          <p className="text-xs text-ink-400 dark:text-ink-500">{budget.team_name || budget.department_name || 'Company-wide'} · {budget.period}</p>
        </div>
        {overBudget && <Badge tone="danger">Over budget</Badge>}
      </div>
      <p className="mt-2 text-xs font-semibold text-ink-700 dark:text-ink-200">
        {formatCurrency(budget.spent_amount, budget.currency)} / {formatCurrency(budget.allocated_amount, budget.currency)}
      </p>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
        <div className={cn('h-full rounded-full', overBudget ? 'bg-red-500' : budget.utilisation_pct > 85 ? 'bg-amber-500' : 'bg-emerald-500')} style={{ width: `${Math.min(100, budget.utilisation_pct)}%` }} />
      </div>
      <p className="mt-1 text-[11px] text-ink-400 dark:text-ink-500">{Math.round(budget.utilisation_pct)}% utilised</p>
    </Card>
  );
}

function LogSpendModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const logSpend = useLogSpend();
  const { data: deptData } = useDepartments({ status: 'active' });
  const departments = deptData?.data || [];
  const [form, setForm] = useState<SpendInput>({
    category: '',
    vendor: '',
    description: '',
    amount: 0,
    currency: 'USD',
    spend_date: new Date().toISOString().slice(0, 10),
    department_id: '',
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    logSpend.mutate(
      { ...form, department_id: form.department_id || undefined },
      {
        onSuccess: () => {
          setForm({ category: '', vendor: '', description: '', amount: 0, currency: 'USD', spend_date: new Date().toISOString().slice(0, 10), department_id: '' });
          onClose();
        },
      }
    );
  }

  return (
    <Modal open={open} onClose={onClose} className="max-w-md" labelledBy="log-spend-title">
      <ModalHeader title="Log spend" onClose={onClose} />
      <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink-700 dark:text-ink-200">Description</span>
          <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} required data-autofocus />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-ink-700 dark:text-ink-200">Category</span>
            <Input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="e.g. software" required />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-ink-700 dark:text-ink-200">Vendor</span>
            <Input value={form.vendor || ''} onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))} />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-ink-700 dark:text-ink-200">Amount</span>
            <Input type="number" min={0} step="0.01" value={form.amount || ''} onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) || 0 }))} required />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-ink-700 dark:text-ink-200">Currency</span>
            <Input value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))} maxLength={3} required />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-ink-700 dark:text-ink-200">Date</span>
            <Input type="date" value={form.spend_date} onChange={(e) => setForm((f) => ({ ...f, spend_date: e.target.value }))} required />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-ink-700 dark:text-ink-200">Department</span>
            <select
              value={form.department_id || ''}
              onChange={(e) => setForm((f) => ({ ...f, department_id: e.target.value }))}
              className="h-10 w-full rounded-control border border-ink-200 bg-white px-3 text-sm text-ink-900 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
            >
              <option value="">None</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {logSpend.isError && <p className="text-sm font-medium text-red-600 dark:text-red-400">{getApiErrorMessage(logSpend.error)}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={logSpend.isPending} disabled={!form.description.trim() || !form.category.trim() || form.amount <= 0}>
            Log spend
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function CreateBudgetModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createBudget = useCreateSpendBudget();
  const { data: deptData } = useDepartments({ status: 'active' });
  const departments = deptData?.data || [];
  const [category, setCategory] = useState('');
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [allocated, setAllocated] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [departmentId, setDepartmentId] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createBudget.mutate(
      { category, period, allocated_amount: Number(allocated) || 0, currency, department_id: departmentId || undefined },
      {
        onSuccess: () => {
          setCategory('');
          setAllocated('');
          setDepartmentId('');
          onClose();
        },
      }
    );
  }

  return (
    <Modal open={open} onClose={onClose} className="max-w-sm" labelledBy="new-budget-title">
      <ModalHeader title="New budget" onClose={onClose} />
      <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink-700 dark:text-ink-200">Category</span>
          <Input value={category} onChange={(e) => setCategory(e.target.value)} required data-autofocus />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink-700 dark:text-ink-200">Department</span>
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="h-10 w-full rounded-control border border-ink-200 bg-white px-3 text-sm text-ink-900 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
          >
            <option value="">Company-wide</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-ink-700 dark:text-ink-200">Period</span>
            <Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} required />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-ink-700 dark:text-ink-200">Allocated</span>
            <Input type="number" min={0} value={allocated} onChange={(e) => setAllocated(e.target.value)} required />
          </label>
        </div>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink-700 dark:text-ink-200">Currency</span>
          <Input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} required />
        </label>
        {createBudget.isError && <p className="text-sm font-medium text-red-600 dark:text-red-400">{getApiErrorMessage(createBudget.error)}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={createBudget.isPending} disabled={!category.trim() || !allocated}>
            Create budget
          </Button>
        </div>
      </form>
    </Modal>
  );
}
