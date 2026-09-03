'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProjectShell } from '@/components/projects/ProjectShell';
import { useProjectKpis, useDeliveryRisk } from '@/hooks/projects/useProjectAnalytics';

const BAND_TONE: Record<string, 'success' | 'warning' | 'danger'> = { low: 'success', medium: 'warning', high: 'danger' };

function AnalyticsInner() {
  const projectId = useSearchParams().get('projectId') || undefined;
  const { data: kpis, isLoading } = useProjectKpis(projectId);
  const { data: risk, isLoading: riskLoading } = useDeliveryRisk(projectId);

  return (
    <ProjectShell projectId={projectId} activeTab="analytics">
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      ) : (
        kpis && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <Kpi label="Task completion" value={`${kpis.taskCompletionPct}%`} />
            <Kpi label="Tasks overdue" value={String(kpis.tasksOverdue)} tone={kpis.tasksOverdue > 0 ? 'danger' : undefined} />
            <Kpi label="Milestones approved" value={`${kpis.milestoneCompletionPct}%`} />
            <Kpi label="Budget used" value={`${kpis.budgetUsedPct}%`} />
            <Kpi label="Open risks" value={String(kpis.openRiskCount)} tone={kpis.openRiskCount > 0 ? 'warning' : undefined} />
            <Kpi label="Change requests" value={String(kpis.changeRequestCount)} />
            <Kpi label="Tracked hours" value={String(kpis.totalTrackedHours)} />
          </div>
        )
      )}

      <Card className="mt-4 p-4">
        <div className="mb-2 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-600" />
          <h3 className="text-sm font-bold text-ink-900 dark:text-white">AI delivery-risk prediction</h3>
          <Badge tone="brand">Beta</Badge>
        </div>

        {riskLoading && <Loader2 className="h-5 w-5 animate-spin text-ink-300" />}

        {!riskLoading && risk && !risk.available && (
          <p className="text-sm text-ink-400 dark:text-ink-500">Risk analysis is temporarily unavailable — the intelligence service didn't respond.</p>
        )}

        {!riskLoading && risk && risk.available && (
          <div>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold text-ink-900 dark:text-white">{risk.riskScore}</span>
              <Badge tone={BAND_TONE[risk.riskBand]} className="capitalize">
                {risk.riskBand} risk
              </Badge>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <SubRisk label="Schedule" value={risk.scheduleRisk} />
              <SubRisk label="Budget" value={risk.budgetRisk} />
              <SubRisk label="Scope" value={risk.scopeRisk} />
            </div>
            {risk.reasonCodes.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {risk.reasonCodes.map((code) => (
                  <li key={code} className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-medium text-ink-600 dark:bg-ink-800 dark:text-ink-300">
                    {code.replace(/_/g, ' ')}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-[11px] text-ink-400 dark:text-ink-500">
              Rule-based scoring ({risk.modelName} {risk.modelVersion}) computed from real project data — not a guaranteed outcome.
            </p>
          </div>
        )}
      </Card>
    </ProjectShell>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: 'danger' | 'warning' }) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-3 shadow-surface dark:border-ink-800 dark:bg-ink-900">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-400 dark:text-ink-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${tone === 'danger' ? 'text-red-600 dark:text-red-400' : tone === 'warning' ? 'text-amber-600 dark:text-amber-400' : 'text-ink-900 dark:text-white'}`}>{value}</p>
    </div>
  );
}

function SubRisk({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-ink-50 py-2 dark:bg-ink-800/60">
      <p className="font-semibold capitalize text-ink-900 dark:text-white">{value}</p>
      <p className="text-ink-400 dark:text-ink-500">{label}</p>
    </div>
  );
}

export default function ProjectAnalyticsPage() {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-ink-300" /></div>}>
      <AnalyticsInner />
    </Suspense>
  );
}
