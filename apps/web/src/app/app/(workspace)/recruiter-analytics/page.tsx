'use client';

import { BarChart3, Briefcase, ListChecks, Loader2, Mail, Star, Target, Users } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { KpiCard, KpiGrid } from '@/components/ui/KpiCard';
import { RecruiterSeatGate } from '@/components/recruiter/RecruiterSeatGate';
import { useRecruiterAnalytics } from '@/hooks/recruiter/useRecruiterAnalytics';
import { getApiErrorMessage } from '@/lib/api';

const STAGE_LABELS: Record<string, string> = {
  sourced: 'Sourced',
  contacted: 'Contacted',
  screening: 'Screening',
  shortlisted: 'Shortlisted',
  submitted: 'Submitted',
  rejected: 'Rejected',
  hired: 'Hired',
};

function RecruiterAnalyticsInner() {
  const { data, isLoading, isError, error } = useRecruiterAnalytics();

  const stageEntries = data ? Object.entries(data.pipeline_by_stage).filter(([, count]) => count > 0) : [];
  const maxStage = Math.max(1, ...stageEntries.map(([, count]) => count));
  const trend = data?.saved_candidates_trend_30d ?? [];
  const maxTrend = Math.max(1, ...trend.map((t) => t.count));

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-4 py-5 lg:px-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
          <BarChart3 className="h-5 w-5 text-brand-600" /> Recruiter Analytics
        </h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
          Sourcing volume, pipeline health and hiring outcomes across your candidate work.
        </p>
      </div>

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

      {data && !isLoading && !isError && (
        <>
          <KpiGrid>
            <KpiCard label="Saved candidates" value={data.kpis.saved_candidates_total} icon={Users} tone="brand" />
            <KpiCard label="Notes taken" value={data.kpis.candidate_notes_total} icon={ListChecks} />
            <KpiCard label="Active projects" value={data.kpis.active_projects} icon={Briefcase} hint={`${data.kpis.total_projects} total`} />
            <KpiCard
              label="Fill rate"
              value={`${data.kpis.fill_rate_pct}%`}
              icon={Target}
              tone={data.kpis.fill_rate_pct >= 50 ? 'success' : 'default'}
              hint={`${data.kpis.filled_hires}/${data.kpis.target_hires} hires`}
            />
            <KpiCard label="Shortlists" value={data.kpis.shortlists_total} icon={Star} />
            <KpiCard label="Talent pools" value={data.kpis.talent_pools_total} icon={Users} />
            <KpiCard label="Active search alerts" value={data.kpis.active_search_alerts} icon={Target} />
            <KpiCard label="Active inbox threads" value={data.kpis.active_inbox_threads} icon={Mail} />
          </KpiGrid>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Pipeline by stage" />
              <div className="space-y-3 px-5 py-4">
                {stageEntries.length === 0 && <p className="py-8 text-center text-sm text-ink-400 dark:text-ink-500">No candidates in any project pipeline yet.</p>}
                {stageEntries.map(([stage, count]) => (
                  <div key={stage} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 text-xs font-semibold text-ink-600 dark:text-ink-300">{STAGE_LABELS[stage] || stage}</span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                      <div className="h-full rounded-full bg-brand-500" style={{ width: `${(count / maxStage) * 100}%` }} />
                    </div>
                    <span className="w-6 shrink-0 text-right text-xs font-semibold text-ink-900 dark:text-white">{count}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <CardHeader title="Saved candidates — last 30 days" />
              <div className="flex h-[180px] items-end gap-1 px-5 py-4">
                {trend.length === 0 && <p className="w-full py-8 text-center text-sm text-ink-400 dark:text-ink-500">No saves in the last 30 days.</p>}
                {trend.map((point) => (
                  <div key={point.date} className="group relative flex flex-1 flex-col items-center justify-end" title={`${point.date}: ${point.count}`}>
                    <div
                      className="w-full rounded-t bg-brand-400 transition-colors group-hover:bg-brand-600"
                      style={{ height: `${Math.max(4, (point.count / maxTrend) * 150)}px` }}
                    />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

export default function RecruiterAnalyticsPage() {
  return (
    <RecruiterSeatGate>
      <RecruiterAnalyticsInner />
    </RecruiterSeatGate>
  );
}
