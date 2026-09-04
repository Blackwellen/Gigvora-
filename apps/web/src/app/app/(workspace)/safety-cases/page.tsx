'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { KpiCard, KpiGrid } from '@/components/ui/KpiCard';
import { useIsPlatformStaff, useSafetyCaseKpis, useSafetyCases } from '@/hooks/trust/useTrust';
import { PageHeader, PageContainer, LoadingBlock, EmptyState, AccessDenied, StatusPill } from '@/components/trust/shared';
import { cn } from '@/lib/cn';

const QUEUES = [
  { key: 'all', label: 'All' },
  { key: 'unassigned', label: 'Unassigned' },
  { key: 'mine', label: 'My cases' },
] as const;

const SEVERITY_TONE: Record<string, string> = {
  low: 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300',
  medium: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  high: 'bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400',
  critical: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400',
};

function SafetyCasesQueue() {
  const [queue, setQueue] = useState<(typeof QUEUES)[number]['key']>('all');
  const { data: kpis } = useSafetyCaseKpis();
  const { data, isLoading } = useSafetyCases({ queue: queue === 'all' ? undefined : queue });
  const cases = data?.data || [];

  return (
    <PageContainer>
      <PageHeader title="Safety Cases" subtitle="Central case-management system for Trust & Safety investigations." />

      <KpiGrid className="lg:grid-cols-4">
        <KpiCard label="New" value={kpis?.byStatus?.new ?? 0} />
        <KpiCard label="High priority" value={kpis?.highPriority ?? 0} tone="warning" />
        <KpiCard label="SLA at risk" value={kpis?.slaAtRisk ?? 0} tone="danger" />
        <KpiCard label="In review" value={kpis?.byStatus?.in_review ?? 0} />
      </KpiGrid>

      <div className="flex flex-wrap gap-2 border-b border-ink-100 pb-3 dark:border-ink-800">
        {QUEUES.map((q) => (
          <button
            key={q.key}
            type="button"
            onClick={() => setQueue(q.key)}
            className={cn('rounded-full px-3 py-1.5 text-sm font-semibold', queue === q.key ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300')}
          >
            {q.label}
          </button>
        ))}
      </div>

      <Card>
        {isLoading && <div className="p-5"><LoadingBlock /></div>}
        {!isLoading && cases.length === 0 && <div className="p-5"><EmptyState title="No cases match this queue" body="Cases created from reports and automated detections will appear here." /></div>}
        {cases.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400 dark:border-ink-800 dark:text-ink-500">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Case</th>
                  <th className="px-4 py-2.5 font-semibold">Type</th>
                  <th className="px-4 py-2.5 font-semibold">Severity</th>
                  <th className="px-4 py-2.5 font-semibold">Reports</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                  <th className="px-4 py-2.5 font-semibold">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
                {cases.map((c) => (
                  <tr key={c.id} className="hover:bg-ink-50 dark:hover:bg-ink-800/40">
                    <td className="px-4 py-3">
                      <Link href={`/app/safety-cases/${c.id}`} className="font-mono text-xs font-semibold text-brand-600 hover:underline">{c.case_number}</Link>
                    </td>
                    <td className="px-4 py-3 capitalize text-ink-600 dark:text-ink-300">{c.case_type}</td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold capitalize', SEVERITY_TONE[c.severity])}>{c.severity}</span>
                    </td>
                    <td className="px-4 py-3 text-ink-600 dark:text-ink-300">{c.reportCount ?? 0}</td>
                    <td className="px-4 py-3"><StatusPill status={c.status} /></td>
                    <td className="px-4 py-3 text-xs text-ink-400 dark:text-ink-500">{new Date(c.updated_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </PageContainer>
  );
}

export default function SafetyCasesPage() {
  const { data: isStaff, isLoading } = useIsPlatformStaff();
  if (isLoading) return <PageContainer><LoadingBlock /></PageContainer>;
  if (!isStaff) return <AccessDenied />;
  return <SafetyCasesQueue />;
}
