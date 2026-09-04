'use client';

import { BarChart3, Loader2, Mail, TrendingUp, Users, Workflow } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { KpiCard, KpiGrid } from '@/components/ui/KpiCard';
import { RecruiterSeatGate } from '@/components/recruiter/RecruiterSeatGate';
import { ProUpgradeBanner } from '@/components/recruiter-pro/ProUpgradeBanner';
import { useRecruiterSeat } from '@/hooks/recruiter/useRecruiterSeat';
import { useRecruiterProAnalytics } from '@/hooks/recruiter-pro/useRecruiterProAnalytics';
import { getApiErrorMessage } from '@/lib/api';

function Bar({ label, value, max, suffix = '%' }: { label: string; value: number; max: number; suffix?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-40 shrink-0 truncate text-xs font-semibold text-ink-600 dark:text-ink-300" title={label}>{label}</span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
        <div className="h-full rounded-full bg-purple-500" style={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }} />
      </div>
      <span className="w-14 shrink-0 text-right text-xs font-semibold text-ink-900 dark:text-white">{value}{suffix}</span>
    </div>
  );
}

function RecruiterProAnalyticsInner() {
  const { data: seat } = useRecruiterSeat();
  const isPro = seat?.tier === 'pro';
  const { data, isLoading, isError, error } = useRecruiterProAnalytics();

  const stageMax = Math.max(1, ...(data?.pipeline_by_stage.map((s) => s.count) || [0]));

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-4 py-5 lg:px-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
          <BarChart3 className="h-5 w-5 text-purple-600" /> Recruiter Pro Analytics
        </h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Funnel performance, reply rates and sequence completion across your Pro workflows.</p>
      </div>

      {!isPro && <ProUpgradeBanner feature="Recruiter Pro Analytics" />}

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
            <KpiCard label="Active campaigns" value={data.kpis.active_campaigns} icon={Mail} tone="brand" />
            <KpiCard label="Avg reply rate" value={`${data.kpis.avg_reply_rate_pct}%`} icon={TrendingUp} tone="success" />
            <KpiCard label="Avg sequence completion" value={`${data.kpis.avg_sequence_completion_pct}%`} icon={Workflow} />
            <KpiCard label="Candidates in pipeline" value={data.kpis.candidates_in_pipeline} icon={Users} />
          </KpiGrid>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Pipeline by stage" />
              <div className="space-y-3 px-5 py-4">
                {data.pipeline_by_stage.length === 0 && <p className="py-8 text-center text-sm text-ink-400 dark:text-ink-500">No pipeline data yet.</p>}
                {data.pipeline_by_stage.map((s) => (
                  <Bar key={s.stage_name} label={s.stage_name} value={s.count} max={stageMax} suffix="" />
                ))}
              </div>
            </Card>

            <Card>
              <CardHeader title="Campaign reply rates" />
              <div className="space-y-3 px-5 py-4">
                {data.campaign_reply_rates.length === 0 && <p className="py-8 text-center text-sm text-ink-400 dark:text-ink-500">No campaigns with replies yet.</p>}
                {data.campaign_reply_rates.map((c) => (
                  <Bar key={c.campaign_name} label={c.campaign_name} value={c.reply_rate_pct} max={100} />
                ))}
              </div>
            </Card>

            <Card>
              <CardHeader title="Sequence completion rates" />
              <div className="space-y-3 px-5 py-4">
                {data.sequence_completion_rates.length === 0 && <p className="py-8 text-center text-sm text-ink-400 dark:text-ink-500">No sequence enrollments yet.</p>}
                {data.sequence_completion_rates.map((s) => (
                  <Bar key={s.sequence_name} label={s.sequence_name} value={s.completion_pct} max={100} />
                ))}
              </div>
            </Card>

            <Card>
              <CardHeader title="Top templates" />
              <div className="divide-y divide-ink-50 dark:divide-ink-800/60">
                {data.top_templates.length === 0 && <p className="px-5 py-8 text-center text-sm text-ink-400 dark:text-ink-500">No templates used yet.</p>}
                {data.top_templates.map((t) => (
                  <div key={t.template_name} className="flex items-center justify-between px-5 py-3">
                    <span className="text-sm font-semibold text-ink-800 dark:text-ink-100">{t.template_name}</span>
                    <span className="text-xs text-ink-500 dark:text-ink-400">{t.usage_count} used · {t.reply_rate_pct}% reply</span>
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

export default function RecruiterProAnalyticsPage() {
  return (
    <RecruiterSeatGate>
      <RecruiterProAnalyticsInner />
    </RecruiterSeatGate>
  );
}
