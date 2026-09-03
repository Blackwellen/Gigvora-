'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { Loader2, Lock, Plus, ShieldCheck } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal, ModalHeader } from '@/components/ui/Modal';
import { ProjectShell } from '@/components/projects/ProjectShell';
import { DisputePanel } from '@/components/disputes/DisputePanel';
import { useProjectMilestones } from '@/hooks/projects/useProjectMilestones';
import { useProjectMembers } from '@/hooks/projects/useProjectMembers';
import { useProject } from '@/hooks/projects/useProject';
import {
  useProjectPaymentMilestones,
  useCreatePaymentMilestone,
  useUpdatePaymentMilestoneStatus,
  useReleasePayment,
  useCreateFundingCheckout,
  useConfirmFunding,
} from '@/hooks/projects/useProjectPayments';
import type { PmPaymentMilestone, PmPaymentMilestoneStatus } from '@/hooks/projects/types';
import { getApiErrorMessage } from '@/lib/api';

const STATUS_TONE: Record<PmPaymentMilestoneStatus, 'neutral' | 'warning' | 'success' | 'danger' | 'brand'> = {
  draft: 'neutral',
  funded: 'brand',
  in_progress: 'brand',
  submitted: 'warning',
  accepted: 'warning',
  release_pending: 'warning',
  released: 'success',
  disputed: 'danger',
  refunded: 'danger',
};
const STATUS_LABEL: Record<PmPaymentMilestoneStatus, string> = {
  draft: 'Awaiting funding',
  funded: 'Funds secured (escrow)',
  in_progress: 'Work in progress',
  submitted: 'Submitted for review',
  accepted: 'Accepted',
  release_pending: 'Release requested',
  released: 'Released',
  disputed: 'Disputed',
  refunded: 'Refunded',
};

function PaymentsInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectId = searchParams.get('projectId') || undefined;
  const fundedSessionId = searchParams.get('fundedSessionId');
  const fundedMilestoneId = searchParams.get('fundedMilestoneId');

  const { data: project } = useProject(projectId);
  const { data: milestones } = useProjectMilestones(projectId);
  const { data: members } = useProjectMembers(projectId);
  const { data: paymentMilestones, isLoading, isError, error } = useProjectPaymentMilestones(projectId);
  const confirmFunding = useConfirmFunding(projectId);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const isOwnerOrManager = project?.myRole === 'owner' || project?.myRole === 'manager';

  // Returning from Stripe Checkout — verify the authorization actually happened before treating
  // this milestone as funded, then strip the query params so a reload can't re-confirm.
  useEffect(() => {
    if (!fundedSessionId || !fundedMilestoneId || !projectId) return;
    setConfirmError(null);
    confirmFunding
      .mutateAsync({ paymentMilestoneId: fundedMilestoneId, sessionId: fundedSessionId })
      .catch((err) => setConfirmError(getApiErrorMessage(err, 'Could not confirm funding.')))
      .finally(() => router.replace(`/app/project-payments?projectId=${projectId}`));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fundedSessionId, fundedMilestoneId, projectId]);

  const milestonesWithoutPayment = (milestones || []).filter((m) => !(paymentMilestones || []).some((pm) => pm.milestoneId === m.id));

  return (
    <ProjectShell
      projectId={projectId}
      activeTab="payments"
      actions={
        isOwnerOrManager && milestonesWithoutPayment.length > 0 ? (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Set up payment protection
          </Button>
        ) : undefined
      }
    >
      <Card className="mb-4 flex items-center gap-2 p-3 text-xs text-ink-500 dark:text-ink-400">
        <ShieldCheck className="h-4 w-4 text-emerald-500" />
        Funds are authorized and held by Stripe when a milestone is funded, and only captured and transferred to the professional when you release it — Gigvora never holds funds itself.
      </Card>

      {confirmError && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">{confirmError}</div>}
      {confirmFunding.isPending && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Confirming your payment authorization with Stripe...
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      )}
      {isError && <Card className="py-14 text-center text-sm text-ink-400">{getApiErrorMessage(error)}</Card>}

      {!isLoading && !isError && (paymentMilestones || []).length === 0 && (
        <Card className="py-14 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">No payment protection set up yet</p>
          <p className="mt-1 text-sm text-ink-400 dark:text-ink-500">Set up escrow-backed payment protection against a milestone so funds are secured before work begins.</p>
        </Card>
      )}

      <div className="space-y-3">
        {(paymentMilestones || []).map((pm) => (
          <PaymentMilestoneCard
            key={pm.id}
            projectId={projectId!}
            paymentMilestone={pm}
            milestoneName={(milestones || []).find((m) => m.id === pm.milestoneId)?.name || 'Milestone'}
            isOwnerOrManager={isOwnerOrManager}
          />
        ))}
      </div>

      {projectId && (
        <CreatePaymentMilestoneModal projectId={projectId} milestones={milestonesWithoutPayment} members={members || []} open={createOpen} onClose={() => setCreateOpen(false)} />
      )}
    </ProjectShell>
  );
}

function PaymentMilestoneCard({
  projectId,
  paymentMilestone,
  milestoneName,
  isOwnerOrManager,
}: {
  projectId: string;
  paymentMilestone: PmPaymentMilestone;
  milestoneName: string;
  isOwnerOrManager: boolean;
}) {
  const updateStatus = useUpdatePaymentMilestoneStatus(projectId);
  const releasePayment = useReleasePayment(projectId);
  const createCheckout = useCreateFundingCheckout(projectId);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleFund() {
    setActionError(null);
    try {
      const { url } = await createCheckout.mutateAsync(paymentMilestone.id);
      window.location.href = url;
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Could not start checkout.'));
    }
  }

  async function handleRelease() {
    setActionError(null);
    try {
      await releasePayment.mutateAsync(paymentMilestone.id);
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Could not release this payment.'));
    }
  }

  async function handleTransition(status: PmPaymentMilestoneStatus) {
    setActionError(null);
    try {
      await updateStatus.mutateAsync({ paymentMilestoneId: paymentMilestone.id, status });
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'This action could not be completed.'));
    }
  }

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-ink-900 dark:text-white">{milestoneName}</h3>
          <p className="text-lg font-bold text-ink-900 dark:text-white">
            ${paymentMilestone.amount.toLocaleString()} <span className="text-xs font-normal text-ink-400">{paymentMilestone.currency}</span>
          </p>
        </div>
        <Badge tone={STATUS_TONE[paymentMilestone.status]}>{STATUS_LABEL[paymentMilestone.status]}</Badge>
      </div>

      {actionError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{actionError}</p>}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {paymentMilestone.status === 'draft' && isOwnerOrManager && (
          <Button size="sm" onClick={handleFund} loading={createCheckout.isPending}>
            <Lock className="h-3.5 w-3.5" /> Fund via Stripe (escrow)
          </Button>
        )}
        {paymentMilestone.status === 'funded' && (
          <Button size="sm" variant="outline" onClick={() => handleTransition('in_progress')} loading={updateStatus.isPending}>
            Start work
          </Button>
        )}
        {paymentMilestone.status === 'in_progress' && (
          <Button size="sm" variant="outline" onClick={() => handleTransition('submitted')} loading={updateStatus.isPending}>
            Submit for review
          </Button>
        )}
        {paymentMilestone.status === 'submitted' && isOwnerOrManager && (
          <Button size="sm" onClick={() => handleTransition('accepted')} loading={updateStatus.isPending}>
            Accept
          </Button>
        )}
        {paymentMilestone.status === 'accepted' && isOwnerOrManager && (
          <Button size="sm" onClick={() => handleTransition('release_pending')} loading={updateStatus.isPending}>
            Request release
          </Button>
        )}
        {paymentMilestone.status === 'release_pending' && isOwnerOrManager && (
          <Button size="sm" onClick={handleRelease} loading={releasePayment.isPending}>
            Release payment
          </Button>
        )}
      </div>

      {!['draft'].includes(paymentMilestone.status) && (
        <div className="mt-3 border-t border-ink-100 pt-3 dark:border-ink-800">
          <DisputePanel objectType="payment_milestone" objectId={paymentMilestone.id} />
        </div>
      )}
    </Card>
  );
}

function CreatePaymentMilestoneModal({
  projectId,
  milestones,
  members,
  open,
  onClose,
}: {
  projectId: string;
  milestones: Array<{ id: string; name: string; amount: number | null }>;
  members: Array<{ id: string; userId: string; firstName: string | null; lastName: string | null; role: string }>;
  open: boolean;
  onClose: () => void;
}) {
  const createPaymentMilestone = useCreatePaymentMilestone(projectId);
  const [milestoneId, setMilestoneId] = useState('');
  const [payeeUserId, setPayeeUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const selectedMilestone = milestones.find((m) => m.id === milestoneId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!milestoneId || !payeeUserId || !Number(amount)) return;
    setFormError(null);
    try {
      await createPaymentMilestone.mutateAsync({ milestoneId, payeeUserId, amount: Number(amount) });
      setMilestoneId('');
      setPayeeUserId('');
      setAmount('');
      onClose();
    } catch (err) {
      setFormError(getApiErrorMessage(err, 'Could not set up payment protection.'));
    }
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy="create-payment-milestone-title" className="max-w-sm">
      <ModalHeader title="Set up payment protection" onClose={onClose} />
      <form onSubmit={handleSubmit} className="space-y-3 p-5">
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Milestone</label>
          <select
            value={milestoneId}
            onChange={(e) => {
              setMilestoneId(e.target.value);
              const m = milestones.find((mm) => mm.id === e.target.value);
              if (m?.amount) setAmount(String(m.amount));
            }}
            className="h-10 w-full rounded-control border border-ink-200 bg-white px-3 text-sm dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200"
            required
          >
            <option value="">Select a milestone</option>
            {milestones.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Pay to</label>
          <select value={payeeUserId} onChange={(e) => setPayeeUserId(e.target.value)} className="h-10 w-full rounded-control border border-ink-200 bg-white px-3 text-sm dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200" required>
            <option value="">Select a member</option>
            {members
              .filter((m) => m.role !== 'client' && m.role !== 'guest')
              .map((m) => (
                <option key={m.id} value={m.userId}>
                  {`${m.firstName || ''} ${m.lastName || ''}`.trim() || m.role}
                </option>
              ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Amount (USD)</label>
          <input
            type="number"
            min="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-10 w-full rounded-control border border-ink-200 bg-white px-3 text-sm dark:border-ink-700 dark:bg-ink-900 dark:text-white"
          />
          {selectedMilestone?.amount && <p className="mt-1 text-xs text-ink-400 dark:text-ink-500">Milestone budget: ${selectedMilestone.amount.toLocaleString()}</p>}
        </div>
        {formError && <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={createPaymentMilestone.isPending} disabled={!milestoneId || !payeeUserId || !Number(amount)}>
            Create
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function ProjectPaymentsPage() {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-ink-300" /></div>}>
      <PaymentsInner />
    </Suspense>
  );
}
