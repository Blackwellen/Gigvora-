'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useIsPlatformStaff, useMyAppeals, useAppealsQueue, useSubmitAppeal } from '@/hooks/trust/useTrust';
import { PageHeader, PageContainer, LoadingBlock, EmptyState, StatusPill } from '@/components/trust/shared';

function UserAppeals() {
  const { data: appeals, isLoading } = useMyAppeals();
  const [reason, setReason] = useState('');
  const [decisionId, setDecisionId] = useState('');
  const submitAppeal = useSubmitAppeal();
  const [showForm, setShowForm] = useState(false);

  return (
    <>
      {showForm ? (
        <Card className="p-5">
          <p className="font-display text-sm font-bold text-ink-900 dark:text-white">Submit an appeal</p>
          <div className="mt-3 space-y-3">
            <input
              placeholder="Decision reference (optional)"
              value={decisionId}
              onChange={(e) => setDecisionId(e.target.value)}
              className="h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm dark:border-ink-700 dark:bg-ink-900"
            />
            <textarea
              rows={4}
              placeholder="Explain why you believe this decision should be reconsidered…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-ink-200 bg-white p-3 text-sm dark:border-ink-700 dark:bg-ink-900"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button
                size="sm"
                loading={submitAppeal.isPending}
                onClick={async () => {
                  await submitAppeal.mutateAsync({ decisionId: decisionId || undefined, reason });
                  setShowForm(false);
                  setReason('');
                  setDecisionId('');
                }}
              >
                Submit appeal
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="flex justify-end"><Button size="sm" onClick={() => setShowForm(true)}>Submit an appeal</Button></div>
      )}

      {isLoading && <LoadingBlock />}
      {!isLoading && (!appeals || appeals.length === 0) && <EmptyState title="No active appeals" body="Appeals you submit against a Gigvora decision will appear here." />}
      <div className="space-y-3">
        {(appeals || []).map((a) => (
          <Link key={a.id} href={`/app/appeals/${a.id}`}>
            <Card className="p-4 hover:border-brand-300">
              <div className="flex items-center justify-between">
                <p className="font-mono text-xs font-semibold text-brand-600">{a.appeal_number}</p>
                <StatusPill status={a.status} />
              </div>
              <p className="mt-2 text-sm text-ink-600 dark:text-ink-300">{a.reason}</p>
              <p className="mt-1 text-xs text-ink-400 dark:text-ink-500">Submitted {new Date(a.submitted_at).toLocaleDateString()}</p>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}

function InternalAppealsQueue() {
  const { data, isLoading } = useAppealsQueue();
  const appeals = data?.data || [];
  return (
    <>
      {isLoading && <LoadingBlock />}
      {!isLoading && appeals.length === 0 && <EmptyState title="No appeals in queue" body="Submitted appeals awaiting review will appear here." />}
      <Card>
        <div className="divide-y divide-ink-100 dark:divide-ink-800">
          {appeals.map((a) => (
            <Link key={a.id} href={`/app/appeals/${a.id}`} className="flex items-center justify-between p-4 text-sm hover:bg-ink-50 dark:hover:bg-ink-800/40">
              <span className="font-mono text-xs font-semibold text-brand-600">{a.appeal_number}</span>
              <span className="text-ink-500 dark:text-ink-400">{new Date(a.submitted_at).toLocaleDateString()}</span>
              <StatusPill status={a.status} />
            </Link>
          ))}
        </div>
      </Card>
    </>
  );
}

export default function AppealsPage() {
  const { data: isStaff } = useIsPlatformStaff();
  return (
    <PageContainer>
      <PageHeader title="Appeals" subtitle="Review of Trust & Safety decisions." />
      {isStaff ? <InternalAppealsQueue /> : <UserAppeals />}
    </PageContainer>
  );
}
