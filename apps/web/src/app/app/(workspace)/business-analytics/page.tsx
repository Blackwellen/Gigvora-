'use client';

import { useState } from 'react';
import { AlertTriangle, BarChart3, Download } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useBusinessOverview, useBusinessTrend } from '@/hooks/business/useBusinessAnalytics';
import { getApiErrorMessage } from '@/lib/api';
import type { TrendMetric, TrendPoint } from '@/hooks/business/types';

const METRICS: Array<{ key: TrendMetric; label: string; color: string; format: (v: number) => string }> = [
  { key: 'headcount', label: 'Headcount trend', color: 'bg-brand-600', format: (v) => `${v}` },
  {
    key: 'spend',
    label: 'Spend trend',
    color: 'bg-purple-500',
    format: (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v),
  },
  { key: 'hiring', label: 'Hiring trend', color: 'bg-emerald-500', format: (v) => `${v} hires` },
];

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function BusinessAnalyticsPage() {
  const [months, setMonths] = useState(12);
  const { data: overview, isLoading: overviewLoading, isError: overviewError } = useBusinessOverview();
  const headcount = useBusinessTrend('headcount', months);
  const spend = useBusinessTrend('spend', months);
  const hiring = useBusinessTrend('hiring', months);

  const trendsByMetric: Record<TrendMetric, typeof headcount> = { headcount, spend, hiring };

  function exportOverviewCsv() {
    if (!overview) return;
    const rows: string[][] = [['Department', 'Total spend']];
    overview.top_departments_by_spend.forEach((d) => rows.push([d.department_name, String(d.total)]));
    rows.push([]);
    rows.push(['Hiring stage', 'Count']);
    overview.hiring_funnel.forEach((f) => rows.push([f.stage, String(f.count)]));
    downloadCsv(`business-analytics-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  }

  const maxFunnel = overview ? Math.max(1, ...overview.hiring_funnel.map((s) => s.count)) : 1;
  const maxDeptSpend = overview ? Math.max(1, ...overview.top_departments_by_spend.map((d) => d.total)) : 1;

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 px-4 py-5 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
            <BarChart3 className="h-5 w-5" /> Business Analytics
          </h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Deeper trend analysis across headcount, spend and hiring.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            aria-label="Trend window"
            className="h-9 rounded-lg border border-ink-200 bg-white px-2.5 text-xs font-semibold text-ink-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200"
          >
            <option value={6}>Last 6 months</option>
            <option value={12}>Last 12 months</option>
            <option value={24}>Last 24 months</option>
          </select>
          <Button variant="outline" size="sm" onClick={exportOverviewCsv} disabled={!overview}>
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {METRICS.map((metric) => (
          <TrendPanel key={metric.key} metric={metric} query={trendsByMetric[metric.key]} />
        ))}
      </div>

      {overviewError && !overviewLoading && (
        <Card className="py-8 text-center">
          <p className="text-sm text-ink-400 dark:text-ink-500">Funnel and spend breakdowns are temporarily unavailable.</p>
        </Card>
      )}

      {overviewLoading && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="h-64 animate-pulse rounded-2xl bg-ink-100 dark:bg-ink-800" />
          <div className="h-64 animate-pulse rounded-2xl bg-ink-100 dark:bg-ink-800" />
        </div>
      )}

      {overview && !overviewLoading && !overviewError && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader
              title="Hiring funnel"
              action={
                <button
                  type="button"
                  onClick={() => downloadCsv('hiring-funnel.csv', [['Stage', 'Count'], ...overview.hiring_funnel.map((f) => [f.stage, String(f.count)])])}
                  className="text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
                >
                  Export
                </button>
              }
            />
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

          <Card>
            <CardHeader
              title="Top departments by spend"
              action={
                <button
                  type="button"
                  onClick={() =>
                    downloadCsv('top-departments-by-spend.csv', [
                      ['Department', 'Total spend'],
                      ...overview.top_departments_by_spend.map((d) => [d.department_name, String(d.total)]),
                    ])
                  }
                  className="text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
                >
                  Export
                </button>
              }
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400 dark:border-ink-800 dark:text-ink-500">
                  <tr>
                    <th className="px-5 py-2.5 font-medium">Department</th>
                    <th className="px-5 py-2.5 font-medium">Share</th>
                    <th className="px-5 py-2.5 text-right font-medium">Total spend</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.top_departments_by_spend.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-5 py-6 text-center text-sm text-ink-400 dark:text-ink-500">
                        No department spend recorded yet.
                      </td>
                    </tr>
                  )}
                  {overview.top_departments_by_spend.map((dept) => {
                    const pct = Math.max(4, Math.round((dept.total / maxDeptSpend) * 100));
                    return (
                      <tr key={dept.department_id} className="border-b border-ink-50 last:border-0 dark:border-ink-800/60">
                        <td className="px-5 py-3 font-semibold text-ink-800 dark:text-ink-100">{dept.department_name}</td>
                        <td className="px-5 py-3">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                            <div className="h-full rounded-full bg-purple-500" style={{ width: `${pct}%` }} />
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right font-bold text-ink-900 dark:text-white">
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(dept.total)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function TrendPanel({
  metric,
  query,
}: {
  metric: { key: TrendMetric; label: string; color: string; format: (v: number) => string };
  query: { data: TrendPoint[] | undefined; isLoading: boolean; isError: boolean };
}) {
  const points = query.data || [];
  const max = Math.max(1, ...points.map((p) => p.value));

  return (
    <Card>
      <CardHeader
        title={metric.label}
        action={
          points.length > 0 && (
            <button
              type="button"
              onClick={() => downloadCsv(`${metric.key}-trend.csv`, [['Month', 'Value'], ...points.map((p) => [p.month, String(p.value)])])}
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
            >
              Export
            </button>
          )
        }
      />
      <div className="px-5 py-4">
        {query.isLoading && <div className="h-32 animate-pulse rounded-xl bg-ink-100 dark:bg-ink-800" />}

        {query.isError && !query.isLoading && (
          <div className="flex h-32 flex-col items-center justify-center gap-1 text-center">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <p className="text-xs text-ink-400 dark:text-ink-500">Couldn&rsquo;t load this trend.</p>
          </div>
        )}

        {!query.isLoading && !query.isError && points.length === 0 && (
          <div className="flex h-32 items-center justify-center text-center text-xs text-ink-400 dark:text-ink-500">No data for this period yet.</div>
        )}

        {!query.isLoading && !query.isError && points.length > 0 && (
          <div className="flex h-32 items-end gap-1">
            {points.map((p) => {
              const heightPct = Math.max(4, Math.round((p.value / max) * 100));
              return (
                <div key={p.month} className="group relative flex flex-1 flex-col items-center gap-1">
                  <div className="flex w-full flex-1 items-end">
                    <div className={`w-full rounded-t-md ${metric.color}`} style={{ height: `${heightPct}%` }} />
                  </div>
                  <span className="text-[9px] text-ink-400 dark:text-ink-500">{p.month.slice(5)}</span>
                  <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink-900 px-1.5 py-0.5 text-[10px] font-semibold text-white opacity-0 shadow-popover transition-opacity group-hover:opacity-100 dark:bg-ink-100 dark:text-ink-900">
                    {metric.format(p.value)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}
