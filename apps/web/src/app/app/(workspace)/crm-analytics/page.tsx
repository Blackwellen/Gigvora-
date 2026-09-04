'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { AlertTriangle, BarChart3, Loader2 } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { KpiCard, KpiGrid } from '@/components/ui/KpiCard';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { CrmLocalNav } from '@/components/crm/CrmLocalNav';
import {
  useCrmAnalyticsOverview,
  useCrmPipelineFunnel,
  useCrmWinLossTrend,
  useCrmLeadSources,
  useCrmTopAccounts,
  useCrmStalePipeline,
} from '@/hooks/crm/useCrmAnalytics';
import type { CrmAccountTier, CrmStalePipelineOpportunity, CrmTopAccount } from '@/hooks/crm/types';
import { getApiErrorMessage } from '@/lib/api';

const selectClass =
  'h-9 rounded-lg border border-ink-200 bg-white px-2.5 text-xs font-semibold text-ink-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200';

const TIER_TONE: Record<CrmAccountTier, 'brand' | 'neutral' | 'success' | 'warning' | 'danger'> = {
  strategic: 'brand',
  key: 'success',
  standard: 'neutral',
  prospect: 'warning',
};

function formatMoney(n: number, currency = 'USD', compact = false) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
    notation: compact ? 'compact' : 'standard',
  }).format(n);
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score == null) return <span className="text-ink-300">—</span>;
  const tone = score >= 70 ? 'success' : score >= 40 ? 'warning' : 'danger';
  const label = score >= 70 ? 'Strong' : score >= 40 ? 'Moderate' : 'Weak';
  return (
    <Badge tone={tone}>
      {score} {label}
    </Badge>
  );
}

function CardErrorState({ error }: { error: unknown }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-10 text-center">
      <AlertTriangle className="h-4 w-4 text-red-400" />
      <p className="text-xs text-ink-400 dark:text-ink-500">{getApiErrorMessage(error)}</p>
    </div>
  );
}

function CardLoadingState() {
  return (
    <div className="flex justify-center py-10">
      <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
    </div>
  );
}

export default function CrmAnalyticsPage() {
  const router = useRouter();
  const [months, setMonths] = useState(6);

  const overview = useCrmAnalyticsOverview();
  const funnel = useCrmPipelineFunnel();
  const winLoss = useCrmWinLossTrend({ months });
  const leadSources = useCrmLeadSources();
  const topAccounts = useCrmTopAccounts({ limit: 10 });
  const stalePipeline = useCrmStalePipeline({ staleDays: 30 });

  const funnelBuckets = funnel.data || [];
  const maxFunnelValue = Math.max(1, ...funnelBuckets.map((b) => b.value));

  const winLossPoints = winLoss.data || [];
  const maxWinLossValue = Math.max(1, ...winLossPoints.flatMap((p) => [p.wonValue, p.lostValue]));

  const leadSourceRows = leadSources.data || [];
  const maxLeadSourceTotal = Math.max(1, ...leadSourceRows.map((r) => r.total));

  const topAccountColumns: DataTableColumn<CrmTopAccount>[] = [
    { key: 'name', header: 'Account', render: (a) => <span className="font-semibold text-ink-900 dark:text-white">{a.name}</span> },
    { key: 'account_tier', header: 'Tier', render: (a) => <Badge tone={TIER_TONE[a.account_tier]}>{a.account_tier}</Badge> },
    { key: 'health', header: 'Health', render: (a) => <ScoreBadge score={a.relationship_health_score} /> },
    { key: 'open_value', header: 'Open value', align: 'right', render: (a) => <span className="font-semibold text-ink-900 dark:text-white">{formatMoney(a.open_value)}</span> },
    { key: 'open_count', header: 'Open opps', align: 'right', render: (a) => <span className="text-ink-600 dark:text-ink-300">{a.open_count}</span> },
  ];

  const stalePipelineColumns: DataTableColumn<CrmStalePipelineOpportunity>[] = [
    { key: 'name', header: 'Opportunity', render: (o) => <span className="font-semibold text-ink-900 dark:text-white">{o.name}</span> },
    { key: 'account_id', header: 'Account', render: (o) => <span className="text-xs text-ink-500 dark:text-ink-400">{o.account_id.slice(0, 8)}</span> },
    { key: 'value', header: 'Value', align: 'right', render: (o) => <span className="font-semibold text-ink-900 dark:text-white">{formatMoney(o.value, o.currency)}</span> },
    {
      key: 'stale',
      header: 'Stale for',
      align: 'center',
      render: (o) => <Badge tone={o.staleDays > 60 ? 'danger' : 'warning'}>{o.staleDays}d</Badge>,
    },
    {
      key: 'close',
      header: 'Close date',
      render: (o) => <span className="text-ink-500 dark:text-ink-400">{o.expected_close_date ? format(new Date(o.expected_close_date), 'MMM d, yyyy') : '—'}</span>,
    },
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-4 py-5 lg:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
            <BarChart3 className="h-5 w-5 text-brand-600" /> CRM Analytics
          </h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Pipeline, conversion, and relationship health trends across your CRM.</p>
        </div>
        <select value={months} onChange={(e) => setMonths(Number(e.target.value))} aria-label="Win/loss trend window" className={selectClass}>
          <option value={3}>Last 3 months</option>
          <option value={6}>Last 6 months</option>
          <option value={12}>Last 12 months</option>
        </select>
      </div>

      <CrmLocalNav active="analytics" />

      {overview.isLoading && (
        <div className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      )}

      {overview.isError && !overview.isLoading && (
        <Card className="py-8 text-center">
          <p className="text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(overview.error)}</p>
        </Card>
      )}

      {overview.data && (
        <KpiGrid>
          <KpiCard label="New contacts" value={overview.data.contactCount} tone="brand" />
          <KpiCard label="Open pipeline" value={formatMoney(overview.data.openPipelineValue, 'USD', true)} />
          <KpiCard label="Won this month" value={formatMoney(overview.data.wonValueThisMonth, 'USD', true)} tone="success" />
          <KpiCard
            label="Overdue follow-ups"
            value={overview.data.overdueFollowups}
            tone={overview.data.overdueFollowups > 0 ? 'warning' : 'default'}
          />
        </KpiGrid>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Pipeline by stage" />
          <div className="px-5 py-4">
            {funnel.isLoading && <CardLoadingState />}
            {funnel.isError && !funnel.isLoading && <CardErrorState error={funnel.error} />}
            {!funnel.isLoading && !funnel.isError && funnelBuckets.length === 0 && (
              <p className="py-6 text-center text-sm text-ink-400 dark:text-ink-500">No pipeline stages configured yet.</p>
            )}
            {!funnel.isLoading && !funnel.isError && funnelBuckets.length > 0 && (
              <div className="space-y-3">
                {funnelBuckets.map((b) => {
                  const pct = Math.max(4, Math.round((b.value / maxFunnelValue) * 100));
                  const barColor = b.isWon ? 'bg-emerald-600' : b.isLost ? 'bg-red-500' : 'bg-brand-600';
                  return (
                    <div key={b.stageId}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-semibold text-ink-600 dark:text-ink-300">{b.label}</span>
                        <span className="font-bold text-ink-900 dark:text-white">
                          {b.count} · {formatMoney(b.value, 'USD', true)}
                        </span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Win/loss trend" />
          <div className="px-5 py-4">
            {winLoss.isLoading && <CardLoadingState />}
            {winLoss.isError && !winLoss.isLoading && <CardErrorState error={winLoss.error} />}
            {!winLoss.isLoading && !winLoss.isError && winLossPoints.length === 0 && (
              <p className="py-6 text-center text-sm text-ink-400 dark:text-ink-500">No closed opportunities in this window.</p>
            )}
            {!winLoss.isLoading && !winLoss.isError && winLossPoints.length > 0 && (
              <div className="flex h-40 items-end gap-2">
                {winLossPoints.map((p) => {
                  const wonPct = Math.max(2, Math.round((p.wonValue / maxWinLossValue) * 100));
                  const lostPct = Math.max(2, Math.round((p.lostValue / maxWinLossValue) * 100));
                  return (
                    <div key={p.month} className="group relative flex flex-1 flex-col items-center gap-1">
                      <div className="flex h-32 w-full items-end justify-center gap-1">
                        <div className="w-2.5 rounded-t-sm bg-emerald-500" style={{ height: `${wonPct}%` }} />
                        <div className="w-2.5 rounded-t-sm bg-red-500" style={{ height: `${lostPct}%` }} />
                      </div>
                      <span className="text-[9px] text-ink-400 dark:text-ink-500">{p.month.slice(5)}</span>
                      <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink-900 px-1.5 py-0.5 text-[10px] font-semibold text-white opacity-0 shadow-popover transition-opacity group-hover:opacity-100 dark:bg-ink-100 dark:text-ink-900">
                        Won {formatMoney(p.wonValue, 'USD', true)} · Lost {formatMoney(p.lostValue, 'USD', true)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="mt-3 flex items-center justify-center gap-4 text-xs text-ink-500 dark:text-ink-400">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Won
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-500" /> Lost
              </span>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Lead sources" />
        <div className="px-2 py-2">
          {leadSources.isLoading && <CardLoadingState />}
          {leadSources.isError && !leadSources.isLoading && <CardErrorState error={leadSources.error} />}
          {!leadSources.isLoading && !leadSources.isError && leadSourceRows.length === 0 && (
            <p className="py-8 text-center text-sm text-ink-400 dark:text-ink-500">No lead source data yet.</p>
          )}
          {!leadSources.isLoading && !leadSources.isError && leadSourceRows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400 dark:border-ink-800 dark:text-ink-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Source</th>
                    <th className="px-3 py-2 font-medium">Total</th>
                    <th className="px-3 py-2 font-medium">Converted</th>
                    <th className="px-3 py-2 font-medium">Conversion rate</th>
                  </tr>
                </thead>
                <tbody>
                  {leadSourceRows.map((r) => {
                    const barPct = Math.max(2, Math.round((r.total / maxLeadSourceTotal) * 100));
                    return (
                      <tr key={r.leadSource} className="border-b border-ink-50 last:border-0 dark:border-ink-800/60">
                        <td className="px-3 py-2.5 font-semibold text-ink-900 dark:text-white">{r.leadSource || 'Unknown'}</td>
                        <td className="px-3 py-2.5 text-ink-600 dark:text-ink-300">{r.total}</td>
                        <td className="px-3 py-2.5 text-ink-600 dark:text-ink-300">{r.converted}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                              <div className="h-full rounded-full bg-brand-600" style={{ width: `${barPct}%` }} />
                            </div>
                            <span className="text-xs font-semibold text-ink-700 dark:text-ink-200">{Math.round(r.conversionRate * 100)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="Top accounts" />
        <div className="p-2">
          {topAccounts.isError && !topAccounts.isLoading ? (
            <CardErrorState error={topAccounts.error} />
          ) : (
            <DataTable
              columns={topAccountColumns}
              data={topAccounts.data || []}
              rowKey={(a) => a.id}
              isLoading={topAccounts.isLoading}
              onRowClick={(a) => router.push(`/app/crm-account-detail?id=${a.id}`)}
              emptyTitle="No top accounts yet"
              emptyDescription="Accounts with open pipeline will be ranked here."
            />
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="Stale pipeline" />
        <div className="p-2">
          {stalePipeline.isError && !stalePipeline.isLoading ? (
            <CardErrorState error={stalePipeline.error} />
          ) : (
            <DataTable
              columns={stalePipelineColumns}
              data={stalePipeline.data || []}
              rowKey={(o) => o.id}
              isLoading={stalePipeline.isLoading}
              onRowClick={(o) => router.push(`/app/crm-opportunity-detail?id=${o.id}`)}
              emptyTitle="No stale opportunities"
              emptyDescription="Opportunities untouched for 30+ days will show up here."
            />
          )}
        </div>
      </Card>
    </div>
  );
}
