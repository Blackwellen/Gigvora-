'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, ChevronLeft, ChevronRight, TriangleAlert } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useReportReasons, useSubmitReport } from '@/hooks/trust/useTrust';
import { PageContainer, LoadingBlock } from '@/components/trust/shared';

function ReportWizard() {
  const params = useSearchParams();
  const objectType = params.get('objectType') || '';
  const objectId = params.get('objectId') || '';

  const [step, setStep] = useState(0);
  const [reasonCode, setReasonCode] = useState('');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState<'normal' | 'urgent' | 'emergency'>('normal');
  const [submitted, setSubmitted] = useState<{ report_number: string } | null>(null);

  const { data: reasons, isLoading } = useReportReasons();
  const submitReport = useSubmitReport();

  async function handleSubmit() {
    const result = await submitReport.mutateAsync({ objectType, objectId, reasonCode, description: description || undefined, urgency });
    setSubmitted(result as unknown as { report_number: string });
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
        <p className="mt-4 font-display text-lg font-bold text-ink-900 dark:text-white">Report submitted</p>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
          Thank you. Reference: <span className="font-mono font-semibold">{submitted.report_number}</span>
        </p>
        <p className="mt-1 text-xs text-ink-400 dark:text-ink-500">You can view updates in your Trust Centre.</p>
        <Link href="/app/trust-centre"><Button className="mt-6">Back to Trust Centre</Button></Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-5 py-6">
      <h1 className="font-display text-xl font-bold text-ink-900 dark:text-white">Report content or a user</h1>

      <Card className="p-6">
        {step === 0 && (
          <div>
            <p className="font-display text-base font-bold text-ink-900 dark:text-white">Why are you reporting this?</p>
            {isLoading ? <LoadingBlock /> : (
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {(reasons || []).map((r) => (
                  <button
                    key={r.code}
                    type="button"
                    onClick={() => setReasonCode(r.code)}
                    className={`rounded-xl border p-3 text-left text-sm font-semibold ${reasonCode === r.code ? 'border-brand-400 bg-brand-50 text-brand-700 dark:bg-brand-500/10' : 'border-ink-100 text-ink-700 hover:border-ink-200 dark:border-ink-800 dark:text-ink-200'}`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <p className="font-display text-base font-bold text-ink-900 dark:text-white">Details</p>
              <textarea
                rows={4}
                className="mt-2 w-full rounded-lg border border-ink-200 bg-white p-3 text-sm dark:border-ink-700 dark:bg-ink-900"
                placeholder="Describe what happened…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold text-ink-600 dark:text-ink-300">Is there an imminent safety concern?</p>
              <div className="flex gap-2">
                {(['normal', 'urgent', 'emergency'] as const).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setUrgency(u)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${urgency === u ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 dark:bg-ink-800'}`}
                  >
                    {u}
                  </button>
                ))}
              </div>
              {urgency === 'emergency' && (
                <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-400">
                  <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <p>Gigvora is not an emergency service. If you or someone else is in immediate danger, please contact local emergency services first.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <p className="font-display text-base font-bold text-ink-900 dark:text-white">Review</p>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between border-b border-ink-100 pb-1.5 dark:border-ink-800"><dt className="text-ink-400">Reason</dt><dd className="font-medium text-ink-800 dark:text-ink-100">{reasons?.find((r) => r.code === reasonCode)?.label}</dd></div>
              <div className="flex justify-between border-b border-ink-100 pb-1.5 dark:border-ink-800"><dt className="text-ink-400">Urgency</dt><dd className="font-medium capitalize text-ink-800 dark:text-ink-100">{urgency}</dd></div>
              <div><dt className="text-ink-400">Details</dt><dd className="mt-1 text-ink-700 dark:text-ink-200">{description || '—'}</dd></div>
            </dl>
            <p className="text-xs text-ink-400 dark:text-ink-500">Your identity is never shared with the person or content you're reporting.</p>
          </div>
        )}
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        {step < 2 ? (
          <Button size="sm" disabled={step === 0 && !reasonCode} onClick={() => setStep((s) => s + 1)}>
            Continue <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button size="sm" onClick={handleSubmit} loading={submitReport.isPending}>
            Submit report
          </Button>
        )}
      </div>
    </div>
  );
}

export default function ReportContentUserNewPage() {
  return (
    <PageContainer>
      <Suspense fallback={<LoadingBlock />}>
        <ReportWizard />
      </Suspense>
    </PageContainer>
  );
}
