'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { Loader2, Plus } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { ProjectShell } from '@/components/projects/ProjectShell';
import { useProjectBudget, useSetProjectBudget, useProjectExpenses, useSubmitExpense, useReviewExpense } from '@/hooks/projects/useProjectBudget';
import { useProject } from '@/hooks/projects/useProject';
import { getApiErrorMessage } from '@/lib/api';

const EXPENSE_TONE: Record<string, 'neutral' | 'warning' | 'success' | 'danger'> = { pending: 'warning', approved: 'neutral', paid: 'success', rejected: 'danger' };

function BudgetInner() {
  const projectId = useSearchParams().get('projectId') || undefined;
  const { data: budget, isLoading, isError, error } = useProjectBudget(projectId);
  const { data: expenses } = useProjectExpenses(projectId);
  const { data: project } = useProject(projectId);
  const canManage = project?.myRole === 'owner' || project?.myRole === 'manager';
  const setBudget = useSetProjectBudget(projectId);
  const submitExpense = useSubmitExpense(projectId);
  const reviewExpense = useReviewExpense(projectId);

  const [totalBudget, setTotalBudget] = useState('');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));

  async function handleSetBudget(e: React.FormEvent) {
    e.preventDefault();
    if (!Number(totalBudget)) return;
    await setBudget.mutateAsync({ totalBudget: Number(totalBudget) });
    setTotalBudget('');
  }

  async function handleSubmitExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!expenseDesc.trim() || !Number(expenseAmount)) return;
    await submitExpense.mutateAsync({ description: expenseDesc, amount: Number(expenseAmount), incurredOn: expenseDate });
    setExpenseDesc('');
    setExpenseAmount('');
  }

  return (
    <ProjectShell projectId={projectId} activeTab="budget">
      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      )}
      {isError && (
        <Card className="py-14 text-center text-sm text-ink-400">{getApiErrorMessage(error)}</Card>
      )}

      {!isLoading && !isError && budget && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Total budget" value={`$${budget.totalBudget.toLocaleString()}`} />
            <Stat label="Committed" value={`$${budget.committed.toLocaleString()}`} />
            <Stat label="Paid" value={`$${budget.paid.toLocaleString()}`} />
            <Stat label="Remaining" value={`$${budget.remaining.toLocaleString()}`} tone={budget.remaining < 0 ? 'danger' : undefined} />
          </div>

          <Card className="flex items-center justify-between p-3 text-sm">
            <span className="text-ink-500 dark:text-ink-400">Escrow-backed milestone payments are managed separately, tied to Stripe.</span>
            <Link href={`/app/project-payments?projectId=${projectId}`} className="font-semibold text-brand-600 hover:text-brand-700">
              Go to Payments →
            </Link>
          </Card>

          {budget.totalBudget === 0 && canManage && (
            <Card className="p-4">
              <h3 className="mb-2 text-sm font-bold text-ink-900 dark:text-white">Set the project budget</h3>
              <form onSubmit={handleSetBudget} className="flex items-end gap-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Total budget (USD)</label>
                  <Input type="number" min="0" value={totalBudget} onChange={(e) => setTotalBudget(e.target.value)} placeholder="60000" />
                </div>
                <Button type="submit" loading={setBudget.isPending} disabled={!Number(totalBudget)}>
                  Save
                </Button>
              </form>
            </Card>
          )}

          <Card className="p-4">
            <h3 className="mb-3 text-sm font-bold text-ink-900 dark:text-white">Submit an expense</h3>
            <form onSubmit={handleSubmitExpense} className="flex flex-wrap items-end gap-2">
              <div className="min-w-[180px] flex-1">
                <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Description</label>
                <Input value={expenseDesc} onChange={(e) => setExpenseDesc(e.target.value)} placeholder="Software license" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Amount</label>
                <Input type="number" min="0" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} className="w-28" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Date</label>
                <Input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
              </div>
              <Button type="submit" loading={submitExpense.isPending} disabled={!expenseDesc.trim() || !Number(expenseAmount)}>
                <Plus className="h-4 w-4" /> Submit
              </Button>
            </form>
          </Card>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400 dark:border-ink-800 dark:text-ink-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Description</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {(expenses || []).map((exp) => (
                    <tr key={exp.id} className="border-b border-ink-50 last:border-0 dark:border-ink-800/60">
                      <td className="px-4 py-3 font-medium text-ink-900 dark:text-white">{exp.description}</td>
                      <td className="px-4 py-3 text-ink-600 dark:text-ink-300">${exp.amount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-ink-600 dark:text-ink-300">{format(new Date(exp.incurredOn), 'MMM d, yyyy')}</td>
                      <td className="px-4 py-3">
                        <Badge tone={EXPENSE_TONE[exp.status]}>{exp.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {exp.status === 'pending' && canManage && (
                          <Button size="sm" variant="outline" onClick={() => reviewExpense.mutate({ expenseId: exp.id, status: 'approved' })} loading={reviewExpense.isPending}>
                            Approve
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {(expenses || []).length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-ink-400 dark:text-ink-500">
                        No expenses logged yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </ProjectShell>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'danger' }) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-3 shadow-surface dark:border-ink-800 dark:bg-ink-900">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-400 dark:text-ink-500">{label}</p>
      <p className={`mt-1 text-lg font-bold ${tone === 'danger' ? 'text-red-600 dark:text-red-400' : 'text-ink-900 dark:text-white'}`}>{value}</p>
    </div>
  );
}

export default function BudgetPage() {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-ink-300" /></div>}>
      <BudgetInner />
    </Suspense>
  );
}
