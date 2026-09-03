'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Award, Clock, Loader2, Target, Users } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { KpiCard, KpiGrid } from '@/components/ui/KpiCard';
import { JobShell } from '@/components/jobs/JobShell';
import { useJobAnalytics } from '@/hooks/jobs/useJobAnalytics';
import { getApiErrorMessage } from '@/lib/api';
import type { JobAnalytics } from '@/hooks/jobs/types';

const FUNNEL_STAGES: Array<{ key: keyof JobAnalytics['funnel']; label: string }> = [
  { key: 'viewed', label: 'Viewed' },
  { key: 'applied', label: 'Applied' },
  { key: 'screened', label: 'Screened' },
  { key: 'interviewed', label: 'Interviewed' },
  { key: 'offered', label: 'Offered' },
  { key: 'hired', label: 'Hired' },
];

function JobAnalyticsInner() {
  const jobId = useSearchParams().get('jobId') || undefined;
  const { data: analytics, isLoading, isError, error } = useJobAnalytics(jobId);

  const maxFunnel = analytics ? Math.max(1, ...FUNNEL_STAGES.map((s) => analytics.funnel[s.key])) : 1;

  return (
    <JobShell jobId={jobId} activeTab="analytics">
      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      )}

      {isError && (
        <Card className="py-16 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Couldn&rsquo;t load analytics</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(error)}</p>
        </Card>
      )}

      {!isLoading && !isError && analytics && (
        <div className="space-y-4">
          <KpiGrid>
            <KpiCard label="Views" value={analytics.funnel.viewed} icon={Users} tone="default" />
            <KpiCard label="Applications" value={analytics.funnel.applied} icon={Target} tone="brand" />
            <KpiCard
              label="Time to fill"
              value={analytics.timeToFillDays !== null ? `${analytics.timeToFillDays}d` : '—'}
              icon={Clock}
              tone="default"
            />
            <KpiCard
              label="Avg. match score"
              value={analytics.applicantQuality.avgMatchScore !== null ? `${Math.round(analytics.applicantQuality.avgMatchScore!)}%` : '—'}
              icon={Award}
              tone="default"
            />
          </KpiGrid>

          <Card>
            <CardHeader title="Candidate funnel" />
            <div className="space-y-3 px-5 py-4">
              {FUNNEL_STAGES.map((stage) => {
                const value = analytics.funnel[stage.key];
                const pct = Math.max(4, Math.round((value / maxFunnel) * 100));
                return (
                  <div key={stage.key}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-semibold text-ink-600 dark:text-ink-300">{stage.label}</span>
                      <span className="font-bold text-ink-900 dark:text-white">{value}</span>
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
            <CardHeader title="Applicant source breakdown" />
            <div className="space-y-2 px-5 py-4">
              {analytics.sourceBreakdown.length === 0 && <p className="text-sm text-ink-400 dark:text-ink-500">No source data yet.</p>}
              {analytics.sourceBreakdown.map((row) => {
                const total = analytics.sourceBreakdown.reduce((sum, r) => sum + r.count, 0) || 1;
                const pct = Math.round((row.count / total) * 100);
                return (
                  <div key={row.source} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 truncate text-sm capitalize text-ink-600 dark:text-ink-300">{row.source}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                      <div className="h-full rounded-full bg-purple-500" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-14 shrink-0 text-right text-xs font-semibold text-ink-500 dark:text-ink-400">
                      {row.count} ({pct}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-4">
            <p className="text-xs text-ink-400 dark:text-ink-500">
              {analytics.applicantQuality.qualifiedPct !== null
                ? `${Math.round(analytics.applicantQuality.qualifiedPct!)}% of applicants meet the job's minimum skills bar.`
                : 'Qualified-applicant rate will appear once enough applications are scored.'}
            </p>
          </Card>
        </div>
      )}
    </JobShell>
  );
}

export default function JobAnalyticsPage() {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-ink-300" /></div>}>
      <JobAnalyticsInner />
    </Suspense>
  );
}
