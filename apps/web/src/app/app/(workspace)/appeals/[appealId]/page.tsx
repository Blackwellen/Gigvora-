'use client';

import { useParams } from 'next/navigation';
import { Card, CardHeader } from '@/components/ui/Card';
import { useAppeal } from '@/hooks/trust/useTrust';
import { PageHeader, PageContainer, LoadingBlock, StatusPill } from '@/components/trust/shared';

export default function AppealDetailPage() {
  const params = useParams<{ appealId: string }>();
  const { data: appeal, isLoading } = useAppeal(params.appealId);

  if (isLoading || !appeal) return <PageContainer><LoadingBlock /></PageContainer>;

  return (
    <PageContainer>
      <PageHeader title={appeal.appeal_number} action={<StatusPill status={appeal.status} />} />
      <Card>
        <CardHeader title="Appeal" />
        <div className="space-y-3 p-5 text-sm">
          <div><p className="text-xs text-ink-400 dark:text-ink-500">Submitted</p><p className="text-ink-700 dark:text-ink-200">{new Date(appeal.submitted_at).toLocaleString()}</p></div>
          <div><p className="text-xs text-ink-400 dark:text-ink-500">Your statement</p><p className="text-ink-700 dark:text-ink-200">{appeal.reason}</p></div>
          {appeal.outcome && (
            <div><p className="text-xs text-ink-400 dark:text-ink-500">Outcome</p><p className="font-semibold capitalize text-ink-800 dark:text-ink-100">{appeal.outcome.replace(/_/g, ' ')}</p></div>
          )}
          {appeal.outcome_reason && (
            <div><p className="text-xs text-ink-400 dark:text-ink-500">Explanation</p><p className="text-ink-700 dark:text-ink-200">{appeal.outcome_reason}</p></div>
          )}
        </div>
      </Card>
    </PageContainer>
  );
}
