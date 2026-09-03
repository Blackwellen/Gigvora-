'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { Ban, CheckCircle2, DollarSign, History, Loader2, Send, ThumbsDown, ThumbsUp, XCircle } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ApplicationShell } from '@/components/jobs/ApplicationShell';
import { useApplication } from '@/hooks/jobs/useApplication';
import { useApproveOffer, useCreateOffer, useOffer, useOfferByApplication, useUpdateOffer } from '@/hooks/jobs/useOffer';
import { getApiErrorMessage } from '@/lib/api';
import type { OfferStatus } from '@/hooks/jobs/types';

const STATUS_TONE: Record<OfferStatus, 'brand' | 'neutral' | 'success' | 'warning' | 'danger'> = {
  draft: 'neutral',
  sent: 'brand',
  negotiating: 'warning',
  accepted: 'success',
  declined: 'danger',
  rescinded: 'danger',
  expired: 'neutral',
};

function CreateOfferForm({ applicationId }: { applicationId: string }) {
  const create = useCreateOffer(applicationId);
  const [baseSalary, setBaseSalary] = useState('');
  const [bonus, setBonus] = useState('');
  const [equity, setEquity] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [startDate, setStartDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  return (
    <Card className="p-6">
      <div className="mb-3 flex items-center gap-2">
        <DollarSign className="h-4 w-4 text-ink-400" />
        <h3 className="text-sm font-bold text-ink-900 dark:text-white">Create an offer</h3>
      </div>
      <form
        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!baseSalary) return;
          setError(null);
          create.mutate(
            {
              baseSalary: Number(baseSalary),
              bonus: bonus ? Number(bonus) : undefined,
              equity: equity || undefined,
              currency,
              startDate: startDate || undefined,
            },
            { onError: (err) => setError(getApiErrorMessage(err)) }
          );
        }}
      >
        <label className="text-sm">
          <span className="mb-1 block font-medium text-ink-600 dark:text-ink-300">Base salary</span>
          <Input type="number" min={0} value={baseSalary} onChange={(e) => setBaseSalary(e.target.value)} required />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-ink-600 dark:text-ink-300">Currency</span>
          <Input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-ink-600 dark:text-ink-300">Bonus</span>
          <Input type="number" min={0} value={bonus} onChange={(e) => setBonus(e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-ink-600 dark:text-ink-300">Equity</span>
          <Input value={equity} onChange={(e) => setEquity(e.target.value)} placeholder="e.g. 0.1% over 4 years" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-ink-600 dark:text-ink-300">Start date</span>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        {error && <p className="text-xs text-red-600 dark:text-red-400 sm:col-span-2">{error}</p>}
        <div className="sm:col-span-2">
          <Button type="submit" loading={create.isPending} disabled={!baseSalary}>
            Create offer (draft)
          </Button>
        </div>
      </form>
    </Card>
  );
}

function OfferInner() {
  const params = useSearchParams();
  const applicationId = params.get('applicationId') || undefined;
  const offerIdParam = params.get('offerId') || undefined;

  const { data: application } = useApplication(applicationId);
  const { data: byApplication, isLoading: byApplicationLoading } = useOfferByApplication(applicationId);
  const { data: byId, isLoading: byIdLoading } = useOffer(!applicationId ? offerIdParam : undefined);
  const offer = applicationId ? byApplication : byId;
  const loading = applicationId ? byApplicationLoading : byIdLoading;

  const updateOffer = useUpdateOffer(offer?.id, applicationId);
  const approveOffer = useApproveOffer(offer?.id, applicationId);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [approvalError, setApprovalError] = useState<string | null>(null);

  function changeStatus(status: OfferStatus) {
    setStatusError(null);
    updateOffer.mutate({ status }, { onError: (e) => setStatusError(getApiErrorMessage(e)) });
  }

  const isJobOwner = application?.is_job_owner;

  const body = (
    <>
      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      )}

      {!loading && !offer && applicationId && <CreateOfferForm applicationId={applicationId} />}

      {!loading && !offer && !applicationId && (
        <div className="rounded-2xl border border-dashed border-ink-200 py-16 text-center dark:border-ink-700">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">No offer found</p>
          <p className="text-sm text-ink-400 dark:text-ink-500">Pass ?applicationId= or ?offerId= to view an offer.</p>
        </div>
      )}

      {offer && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-2">
            <div className="flex items-center justify-between">
              <CardHeader title="Compensation" className="px-0 pt-0" />
              <Badge tone={STATUS_TONE[offer.status]} className="capitalize">{offer.status}</Badge>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <Stat label="Base salary" value={`${offer.currency} ${offer.base_salary.toLocaleString()}`} />
              <Stat label="Bonus" value={offer.bonus ? `${offer.currency} ${offer.bonus.toLocaleString()}` : '—'} />
              <Stat label="Equity" value={offer.equity || '—'} />
              <Stat label="Start date" value={offer.start_date ? format(new Date(offer.start_date), 'MMM d, yyyy') : '—'} />
            </div>

            {statusError && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
                {statusError}
              </div>
            )}

            {isJobOwner && (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-ink-100 pt-4 dark:border-ink-800">
                {offer.status === 'draft' && (
                  <Button size="sm" loading={updateOffer.isPending} onClick={() => changeStatus('sent')}>
                    <Send className="h-3.5 w-3.5" /> Send offer
                  </Button>
                )}
                {(offer.status === 'sent' || offer.status === 'negotiating') && (
                  <>
                    <Button size="sm" variant="secondary" loading={updateOffer.isPending} onClick={() => changeStatus('accepted')}>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Mark accepted
                    </Button>
                    <Button size="sm" variant="outline" loading={updateOffer.isPending} onClick={() => changeStatus('declined')}>
                      <XCircle className="h-3.5 w-3.5" /> Mark declined
                    </Button>
                    <Button size="sm" variant="danger" loading={updateOffer.isPending} onClick={() => changeStatus('rescinded')}>
                      <Ban className="h-3.5 w-3.5" /> Rescind
                    </Button>
                  </>
                )}
              </div>
            )}

            <div className="mt-5 border-t border-ink-100 pt-4 dark:border-ink-800">
              <div className="mb-2 flex items-center gap-2">
                <History className="h-4 w-4 text-ink-400" />
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">Negotiation history</p>
              </div>
              {(offer.versions?.length ?? 0) === 0 ? (
                <p className="text-sm text-ink-400 dark:text-ink-500">No revisions recorded yet.</p>
              ) : (
                <ol className="space-y-2">
                  {offer.versions!.map((v) => (
                    <li key={v.id} className="rounded-xl border border-ink-100 p-3 text-sm dark:border-ink-800">
                      <p className="font-semibold text-ink-900 dark:text-white">Version {v.version_number}</p>
                      <p className="text-xs text-ink-400 dark:text-ink-500">{format(new Date(v.created_at), 'MMM d, yyyy · h:mm a')}</p>
                      <ul className="mt-1 space-y-0.5 text-xs text-ink-500 dark:text-ink-400">
                        {Object.entries(v.changes).map(([k, val]) => (
                          <li key={k}><span className="font-semibold capitalize text-ink-700 dark:text-ink-200">{k.replace(/_/g, ' ')}:</span> {String(val)}</li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </Card>

          <Card className="p-5">
            <CardHeader title="Approval chain" className="px-0 pt-0" />
            <div className="mt-3 space-y-2">
              {(offer.approvals?.length ?? 0) === 0 ? (
                <p className="text-sm text-ink-400 dark:text-ink-500">No approvals requested yet.</p>
              ) : (
                offer.approvals!.map((a) => (
                  <div key={a.id} className="rounded-xl border border-ink-100 p-3 dark:border-ink-800">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-ink-900 dark:text-white">{a.approver_name || 'Approver'}</p>
                      <Badge tone={a.decision === 'approved' ? 'success' : a.decision === 'rejected' ? 'danger' : 'neutral'} className="capitalize">
                        {a.decision}
                      </Badge>
                    </div>
                    {a.notes && <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">{a.notes}</p>}
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 space-y-2 border-t border-ink-100 pt-4 dark:border-ink-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">Add your decision</p>
              <textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="Notes (optional)"
                rows={3}
                className="w-full rounded-control border border-ink-200 bg-white p-3 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
              />
              {approvalError && <p className="text-xs text-red-600 dark:text-red-400">{approvalError}</p>}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  loading={approveOffer.isPending}
                  onClick={() => {
                    setApprovalError(null);
                    approveOffer.mutate(
                      { decision: 'approved', notes: approvalNotes || undefined },
                      { onSuccess: () => setApprovalNotes(''), onError: (e) => setApprovalError(getApiErrorMessage(e)) }
                    );
                  }}
                >
                  <ThumbsUp className="h-3.5 w-3.5" /> Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  loading={approveOffer.isPending}
                  onClick={() => {
                    setApprovalError(null);
                    approveOffer.mutate(
                      { decision: 'rejected', notes: approvalNotes || undefined },
                      { onSuccess: () => setApprovalNotes(''), onError: (e) => setApprovalError(getApiErrorMessage(e)) }
                    );
                  }}
                >
                  <ThumbsDown className="h-3.5 w-3.5" /> Reject
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );

  if (applicationId) {
    return (
      <ApplicationShell applicationId={applicationId} activeStage="offer">
        {body}
      </ApplicationShell>
    );
  }

  return <div className="mx-auto max-w-[1400px] space-y-4 px-4 py-5 lg:px-6">{body}</div>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-ink-50 p-3 dark:bg-ink-800/60">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-400 dark:text-ink-500">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-ink-900 dark:text-white">{value}</p>
    </div>
  );
}

export default function OfferPage() {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-ink-300" /></div>}>
      <OfferInner />
    </Suspense>
  );
}
