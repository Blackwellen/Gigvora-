'use client';

import { useParams } from 'next/navigation';
import { Card, CardHeader } from '@/components/ui/Card';
import { useIsPlatformStaff, useSafetyCase } from '@/hooks/trust/useTrust';
import { PageHeader, PageContainer, TwoColumnLayout, LoadingBlock, AccessDenied, StatusPill } from '@/components/trust/shared';

function SafetyCaseDetail({ caseId }: { caseId: string }) {
  const { data: safetyCase, isLoading } = useSafetyCase(caseId);
  if (isLoading || !safetyCase) return <PageContainer><LoadingBlock /></PageContainer>;

  return (
    <PageContainer>
      <PageHeader title={safetyCase.case_number} subtitle={`${safetyCase.case_type} · ${safetyCase.policy_category || 'Uncategorised'}`} action={<StatusPill status={safetyCase.status} />} />
      <TwoColumnLayout
        main={
          <>
            <Card>
              <CardHeader title="Overview" />
              <div className="grid grid-cols-2 gap-3 p-5 text-sm">
                <div><p className="text-xs text-ink-400 dark:text-ink-500">Severity</p><p className="font-semibold capitalize text-ink-800 dark:text-ink-100">{safetyCase.severity}</p></div>
                <div><p className="text-xs text-ink-400 dark:text-ink-500">Subject</p><p className="font-mono text-xs text-ink-600 dark:text-ink-300">{safetyCase.subject_type}:{safetyCase.subject_id}</p></div>
                <div><p className="text-xs text-ink-400 dark:text-ink-500">Reports</p><p className="font-semibold text-ink-800 dark:text-ink-100">{safetyCase.reports?.length ?? 0}</p></div>
                <div><p className="text-xs text-ink-400 dark:text-ink-500">Risk score</p><p className="font-semibold text-ink-800 dark:text-ink-100">{safetyCase.risk_score != null ? safetyCase.risk_score.toFixed(2) : '—'}</p></div>
              </div>
            </Card>
            <Card>
              <CardHeader title="Reports" />
              <div className="divide-y divide-ink-100 p-2 dark:divide-ink-800">
                {(safetyCase.reports || []).map((r: { id: string; report_number: string; reason_code: string; urgency: string }) => (
                  <div key={r.id} className="p-3 text-sm">
                    <p className="font-mono text-xs font-semibold text-brand-600">{r.report_number}</p>
                    <p className="text-ink-600 dark:text-ink-300 capitalize">{r.reason_code.replace(/_/g, ' ')} · {r.urgency}</p>
                  </div>
                ))}
                {(!safetyCase.reports || safetyCase.reports.length === 0) && <p className="p-3 text-sm text-ink-400 dark:text-ink-500">No linked reports.</p>}
              </div>
            </Card>
            <Card>
              <CardHeader title="History" />
              <div className="divide-y divide-ink-100 p-2 dark:divide-ink-800">
                {(safetyCase.history || []).map((h: { id: string; from_status: string | null; to_status: string; created_at: string }) => (
                  <div key={h.id} className="flex items-center justify-between p-3 text-sm">
                    <p className="text-ink-600 dark:text-ink-300">{h.from_status || 'created'} → {h.to_status}</p>
                    <p className="text-xs text-ink-400 dark:text-ink-500">{new Date(h.created_at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </Card>
          </>
        }
        rail={
          <>
            <Card className="p-4">
              <p className="font-display text-sm font-bold text-ink-900 dark:text-white">Case Intelligence</p>
              <p className="mt-2 text-xs text-ink-400 dark:text-ink-500">Beta</p>
              <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">
                Automated risk score: {safetyCase.risk_score != null ? safetyCase.risk_score.toFixed(2) : 'not yet computed'}. Review required before any enforcement action.
              </p>
            </Card>
            <Card className="p-4">
              <p className="font-display text-sm font-bold text-ink-900 dark:text-white">Decisions</p>
              <div className="mt-2 space-y-2 text-sm">
                {(safetyCase.decisions || []).length === 0 && <p className="text-ink-400 dark:text-ink-500">No decisions recorded.</p>}
                {(safetyCase.decisions || []).map((d: { id: string; action_type: string; status: string }) => (
                  <div key={d.id} className="flex items-center justify-between">
                    <span className="text-ink-700 dark:text-ink-200">{d.action_type}</span>
                    <StatusPill status={d.status} />
                  </div>
                ))}
              </div>
            </Card>
          </>
        }
      />
    </PageContainer>
  );
}

export default function SafetyCaseDetailPage() {
  const params = useParams<{ caseId: string }>();
  const { data: isStaff, isLoading } = useIsPlatformStaff();
  if (isLoading) return <PageContainer><LoadingBlock /></PageContainer>;
  if (!isStaff) return <AccessDenied />;
  return <SafetyCaseDetail caseId={params.caseId} />;
}
