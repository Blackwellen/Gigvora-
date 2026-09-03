'use client';

import Link from 'next/link';
import { AlertTriangle, Briefcase, Percent, Target, UserPlus, Users, Wallet } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { KpiCard, KpiGrid } from '@/components/ui/KpiCard';
import { useBusinessOverview } from '@/hooks/business/useBusinessAnalytics';
import { getApiErrorMessage } from '@/lib/api';

function formatCurrency(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

export default function BusinessDashboardPage() {
  const { data: overview, isLoading, isError, error } = useBusinessOverview();

  const maxFunnel = overview ? Math.max(1, ...overview.hiring_funnel.map((s) => s.count)) : 1;
  const maxDeptSpend = overview ? Math.max(1, ...overview.top_departments_by_spend.map((d) => d.total)) : 1;
  const plan = overview?.workforce_plan_progress;
  const planPct = plan && plan.target_headcount > 0 ? Math.min(100, Math.round((plan.current_headcount / plan.target_headcount) * 100)) : 0;

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 px-4 py-5 lg:px-6">
      <div>
        <h1 className="text-xl font-bold text-ink-900 dark:text-white">Business Dashboard</h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Operational KPIs for headcount, hiring and spend across the workspace.</p>
      </div>

      {isLoading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-ink-100 dark:bg-ink-800" />
            ))}
          </div>
          <div className="h-56 animate-pulse rounded-2xl bg-ink-100 dark:bg-ink-800" />
        </div>
      )}

      {isError && !isLoading && (
        <Card className="py-16 text-center">
          <AlertTriangle className="mx-auto h-6 w-6 text-red-500" />
          <p className="mt-2 text-sm font-semibold text-ink-700 dark:text-ink-200">Couldn&rsquo;t load the dashboard</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(error)}</p>
        </Card>
      )}

      {overview && !isLoading && !isError && (
        <>
          <KpiGrid className="sm:grid-cols-3 lg:grid-cols-5">
            <KpiCard label="Headcount" value={`${overview.headcount.current} / ${overview.headcount.target}`} icon={Users} tone="brand" />
            <KpiCard label="Open roles" value={overview.open_roles} icon={Briefcase} />
            <KpiCard label="Hires this quarter" value={overview.hires_this_quarter} icon={UserPlus} tone="success" />
            <KpiCard label="Spend MTD" value={formatCurrency(overview.spend_mtd, overview.spend_currency)} icon={Wallet} />
            <KpiCard
              label="Avg. utilisation"
              value={`${Math.round(overview.avg_team_utilisation_pct)}%`}
              icon={Percent}
              tone={overview.avg_team_utilisation_pct > 95 ? 'danger' : overview.avg_team_utilisation_pct > 80 ? 'warning' : 'success'}
            />
          </KpiGrid>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardHeader title="Hiring funnel" />
              <div className="space-y-3 px-5 py-4">
                {overview.hiring_funnel.length === 0 && <p className="text-sm text-ink-400 dark:text-ink-500">No hiring activity recorded yet.</p>}
                {overview.hiring_funnel.map((stage) => {
                  const pct = Math.max(4, Math.round((stage.count / maxFunnel) * 100));
                  return (
                    <div key={stage.stage}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-semibold capitalize text-ink-600 dark:text-ink-300">{stage.stage.replace(/_/g, ' ')}</span>
                        <span className="font-bold text-ink-900 dark:text-white">{stage.count}</span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                        <div className="h-full rounded-full bg-brand-600" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader title="Top departments by spend" action={<Link href="/app/spend" className="text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400">View spend</Link>} />
              <div className="space-y-2 px-5 py-4">
                {overview.top_departments_by_spend.length === 0 && (
                  <p className="text-sm text-ink-400 dark:text-ink-500">No department spend recorded yet.</p>
                )}
                {overview.top_departments_by_spend.map((dept) => {
                  const pct = Math.max(4, Math.round((dept.total / maxDeptSpend) * 100));
                  return (
                    <div key={dept.department_id}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="truncate font-semibold text-ink-600 dark:text-ink-300">{dept.department_name}</span>
                        <span className="font-bold text-ink-900 dark:text-white">{formatCurrency(dept.total, overview.spend_currency)}</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                        <div className="h-full rounded-full bg-purple-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          <Card>
            <CardHeader title="Workforce plan progress" action={<Link href="/app/workforce-planning" className="text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400">Open workforce planning</Link>} />
            <div className="px-5 py-4">
              {!plan && (
                <div className="flex items-center gap-2 text-sm text-ink-400 dark:text-ink-500">
                  <Target className="h-4 w-4" />
                  No active workforce plan yet — create one to track headcount progress.
                </div>
              )}
              {plan && (
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-semibold text-ink-700 dark:text-ink-200">{plan.plan_name}</span>
                    <span className="font-bold text-ink-900 dark:text-white">
                      {plan.current_headcount} / {plan.target_headcount} ({planPct}%)
                    </span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                    <div
                      className={`h-full rounded-full ${planPct >= 100 ? 'bg-emerald-500' : 'bg-brand-600'}`}
                      style={{ width: `${planPct}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
