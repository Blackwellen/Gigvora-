'use client';

import { useState } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import { AlertTriangle, Loader2, Paperclip, Send } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  useDisputesForObject,
  useOpenDispute,
  useDisputeEvidence,
  useSubmitEvidence,
  useDisputeMessages,
  usePostDisputeMessage,
  useTransitionDispute,
} from '@/hooks/disputes/useDisputes';
import type { DisputeStage } from '@/hooks/disputes/types';
import { getApiErrorMessage } from '@/lib/api';

const STAGE_TONE: Record<DisputeStage, 'neutral' | 'warning' | 'success' | 'danger'> = {
  opened: 'danger',
  evidence_submitted: 'warning',
  under_review: 'warning',
  resolved_client: 'success',
  resolved_professional: 'success',
  resolved_split: 'success',
  closed: 'neutral',
};
const STAGE_LABEL: Record<DisputeStage, string> = {
  opened: 'Opened',
  evidence_submitted: 'Evidence submitted',
  under_review: 'Under review',
  resolved_client: 'Resolved — refunded to client',
  resolved_professional: 'Resolved — paid to professional',
  resolved_split: 'Resolved — split',
  closed: 'Closed',
};

/**
 * Generic, reusable dispute UI — same component regardless of what
 * object_type/object_id it's pointed at (a Domain 18 payment milestone
 * today; designed to work unmodified for a future gig-payment dispute).
 */
export function DisputePanel({ objectType, objectId }: { objectType: string; objectId: string }) {
  const { data: disputes, isLoading } = useDisputesForObject(objectType, objectId);
  const openDispute = useOpenDispute(objectType, objectId);
  const [reason, setReason] = useState('');
  const [openError, setOpenError] = useState<string | null>(null);
  const [showOpenForm, setShowOpenForm] = useState(false);

  const activeDispute = (disputes || []).find((d) => !['resolved_client', 'resolved_professional', 'resolved_split', 'closed'].includes(d.stage));
  const closedDisputes = (disputes || []).filter((d) => d !== activeDispute);

  async function handleOpen(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) return;
    setOpenError(null);
    try {
      await openDispute.mutateAsync(reason.trim());
      setReason('');
      setShowOpenForm(false);
    } catch (err) {
      setOpenError(getApiErrorMessage(err, 'Could not open a dispute.'));
    }
  }

  if (isLoading) {
    return (
      <Card className="p-4">
        <Loader2 className="h-4 w-4 animate-spin text-ink-300" />
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {!activeDispute && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold text-ink-900 dark:text-white">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Dispute
            </h3>
            {!showOpenForm && (
              <Button size="sm" variant="outline" onClick={() => setShowOpenForm(true)}>
                Open a dispute
              </Button>
            )}
          </div>
          {showOpenForm && (
            <form onSubmit={handleOpen} className="mt-3 space-y-2">
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Explain what's wrong and what outcome you're asking for..."
                className="w-full rounded-control border border-ink-200 bg-white p-3 text-sm dark:border-ink-700 dark:bg-ink-900 dark:text-white"
              />
              {openError && <p className="text-sm text-red-600 dark:text-red-400">{openError}</p>}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowOpenForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" variant="danger" loading={openDispute.isPending} disabled={!reason.trim()}>
                  Submit dispute
                </Button>
              </div>
            </form>
          )}
        </Card>
      )}

      {activeDispute && <ActiveDisputeCard dispute={activeDispute} />}

      {closedDisputes.length > 0 && (
        <details className="text-sm text-ink-500 dark:text-ink-400">
          <summary className="cursor-pointer font-semibold">Past disputes ({closedDisputes.length})</summary>
          <ul className="mt-2 space-y-1">
            {closedDisputes.map((d) => (
              <li key={d.id} className="flex items-center justify-between">
                <span>{d.reason}</span>
                <Badge tone={STAGE_TONE[d.stage]}>{STAGE_LABEL[d.stage]}</Badge>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function ActiveDisputeCard({ dispute }: { dispute: NonNullable<ReturnType<typeof useDisputesForObject>['data']>[number] }) {
  const { data: evidence } = useDisputeEvidence(dispute.id);
  const { data: messages } = useDisputeMessages(dispute.id);
  const submitEvidence = useSubmitEvidence(dispute.id);
  const postMessage = usePostDisputeMessage(dispute.id);
  const transition = useTransitionDispute(dispute.id);

  const [evidenceDesc, setEvidenceDesc] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [resolveNote, setResolveNote] = useState('');
  const [splitPct, setSplitPct] = useState('50');
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleEvidence(e: React.FormEvent) {
    e.preventDefault();
    if (!evidenceDesc.trim()) return;
    await submitEvidence.mutateAsync({ description: evidenceDesc.trim() });
    setEvidenceDesc('');
  }

  async function handleMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!messageBody.trim()) return;
    await postMessage.mutateAsync(messageBody.trim());
    setMessageBody('');
  }

  async function handleResolve(stage: 'resolved_client' | 'resolved_professional' | 'resolved_split') {
    setActionError(null);
    try {
      await transition.mutateAsync({ stage, resolutionNote: resolveNote || undefined, resolvedSplitPct: stage === 'resolved_split' ? Number(splitPct) : undefined });
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Could not resolve this dispute.'));
    }
  }

  return (
    <Card className="border-red-200 bg-red-50/40 p-4 dark:border-red-500/30 dark:bg-red-500/5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-red-800 dark:text-red-300">
            <AlertTriangle className="h-4 w-4" /> Active dispute
          </h3>
          <p className="mt-1 text-sm text-ink-700 dark:text-ink-300">{dispute.reason}</p>
        </div>
        <Badge tone={STAGE_TONE[dispute.stage]}>{STAGE_LABEL[dispute.stage]}</Badge>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">Evidence</h4>
          <ul className="mb-2 space-y-1">
            {(evidence || []).map((e) => (
              <li key={e.id} className="flex items-center gap-1.5 text-xs text-ink-600 dark:text-ink-300">
                <Paperclip className="h-3 w-3" /> {e.description}
              </li>
            ))}
            {(evidence || []).length === 0 && <li className="text-xs text-ink-400 dark:text-ink-500">No evidence submitted yet.</li>}
          </ul>
          {['opened', 'evidence_submitted', 'under_review'].includes(dispute.stage) && (
            <form onSubmit={handleEvidence} className="flex gap-1.5">
              <Input value={evidenceDesc} onChange={(e) => setEvidenceDesc(e.target.value)} placeholder="Describe your evidence" className="flex-1" />
              <Button type="submit" size="sm" variant="outline" loading={submitEvidence.isPending} disabled={!evidenceDesc.trim()}>
                Add
              </Button>
            </form>
          )}
        </div>

        <div>
          <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">Messages</h4>
          <ul className="mb-2 max-h-32 space-y-1 overflow-y-auto">
            {(messages || []).map((m) => (
              <li key={m.id} className="rounded bg-white px-2 py-1 text-xs text-ink-700 dark:bg-ink-900 dark:text-ink-300">
                {m.body} <span className="text-ink-400 dark:text-ink-500">· {formatDistanceToNowStrict(new Date(m.createdAt))} ago</span>
              </li>
            ))}
            {(messages || []).length === 0 && <li className="text-xs text-ink-400 dark:text-ink-500">No messages yet.</li>}
          </ul>
          <form onSubmit={handleMessage} className="flex gap-1.5">
            <Input value={messageBody} onChange={(e) => setMessageBody(e.target.value)} placeholder="Write a message" className="flex-1" />
            <Button type="submit" size="sm" variant="outline" loading={postMessage.isPending} disabled={!messageBody.trim()}>
              <Send className="h-3.5 w-3.5" />
            </Button>
          </form>
        </div>
      </div>

      {dispute.stage !== 'under_review' && !['resolved_client', 'resolved_professional', 'resolved_split', 'closed'].includes(dispute.stage) && (
        <Button size="sm" className="mt-3" variant="outline" onClick={() => transition.mutate({ stage: 'under_review' })} loading={transition.isPending}>
          Request review
        </Button>
      )}

      {dispute.canResolve && dispute.stage === 'under_review' && (
        <div className="mt-3 space-y-2 border-t border-red-200 pt-3 dark:border-red-500/30">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">Resolve (project manager only)</p>
          <Input value={resolveNote} onChange={(e) => setResolveNote(e.target.value)} placeholder="Resolution note (optional)" />
          {actionError && <p className="text-sm text-red-600 dark:text-red-400">{actionError}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => handleResolve('resolved_professional')} loading={transition.isPending}>
              Pay professional
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleResolve('resolved_client')} loading={transition.isPending}>
              Refund client
            </Button>
            <div className="flex items-center gap-1">
              <Input type="number" min="0" max="100" value={splitPct} onChange={(e) => setSplitPct(e.target.value)} className="w-16" />
              <span className="text-xs text-ink-500">% to professional</span>
              <Button size="sm" variant="outline" onClick={() => handleResolve('resolved_split')} loading={transition.isPending}>
                Split
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
