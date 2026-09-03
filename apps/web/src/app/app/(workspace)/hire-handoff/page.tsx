'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { CheckSquare, ClipboardCheck, Loader2, Square, UserCheck } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ApplicationShell } from '@/components/jobs/ApplicationShell';
import { useApplication } from '@/hooks/jobs/useApplication';
import { useCreateHireHandoff, useHireHandoffByApplication, useUpdateHireHandoff } from '@/hooks/jobs/useHireHandoff';
import { getApiErrorMessage } from '@/lib/api';
import type { HireHandoffStatus } from '@/hooks/jobs/types';

const DEFAULT_CHECKLIST = [
  { key: 'offer_signed', label: 'Signed offer letter received', done: false },
  { key: 'background_check', label: 'Background check completed', done: false },
  { key: 'equipment', label: 'Equipment ordered', done: false },
  { key: 'accounts', label: 'System accounts provisioned', done: false },
  { key: 'orientation', label: 'Orientation scheduled', done: false },
];

const STATUS_TONE: Record<HireHandoffStatus, 'brand' | 'neutral' | 'success' | 'warning'> = {
  pending: 'neutral',
  in_progress: 'warning',
  completed: 'success',
};

function CreateHandoffPanel({ applicationId }: { applicationId: string }) {
  const create = useCreateHireHandoff(applicationId);
  const [startDate, setStartDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  return (
    <Card className="p-6">
      <div className="mb-3 flex items-center gap-2">
        <ClipboardCheck className="h-4 w-4 text-ink-400" />
        <h3 className="text-sm font-bold text-ink-900 dark:text-white">Start onboarding handoff</h3>
      </div>
      <p className="mb-3 text-sm text-ink-500 dark:text-ink-400">No handoff record exists yet for this application. Create one to start the onboarding checklist.</p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-ink-600 dark:text-ink-300">Confirmed start date</span>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <Button
          loading={create.isPending}
          onClick={() => {
            setError(null);
            create.mutate({ startDate: startDate || undefined }, { onError: (e) => setError(getApiErrorMessage(e)) });
          }}
        >
          Create handoff record
        </Button>
      </div>
      {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </Card>
  );
}

function HireHandoffInner() {
  const applicationId = useSearchParams().get('applicationId') || undefined;
  const { data: application } = useApplication(applicationId);
  const { data: handoff, isLoading } = useHireHandoffByApplication(applicationId);
  const update = useUpdateHireHandoff(handoff?.id, applicationId);
  const [notes, setNotes] = useState(handoff?.notes || '');
  const [notesDirty, setNotesDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const candidateName = [application?.candidate?.first_name, application?.candidate?.last_name].filter(Boolean).join(' ') || 'the candidate';

  const body = (
    <>
      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      )}

      {!isLoading && !handoff && applicationId && application?.status !== 'hired' && application?.status !== 'offered' && (
        <div className="rounded-2xl border border-dashed border-ink-200 py-16 text-center dark:border-ink-700">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Not ready for onboarding yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">
            A handoff typically starts once {candidateName}&apos;s offer has been accepted. You can still create one manually if needed.
          </p>
          <div className="mt-4 flex justify-center">
            <CreateHandoffPanel applicationId={applicationId} />
          </div>
        </div>
      )}

      {!isLoading && !handoff && applicationId && (application?.status === 'hired' || application?.status === 'offered') && (
        <CreateHandoffPanel applicationId={applicationId} />
      )}

      {handoff && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-2">
            <div className="flex items-center justify-between">
              <CardHeader title="Onboarding checklist" className="px-0 pt-0" />
              <Badge tone={STATUS_TONE[handoff.status]} className="capitalize">{handoff.status.replace('_', ' ')}</Badge>
            </div>
            {error && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
                {error}
              </div>
            )}
            <ul className="mt-3 space-y-1.5">
              {(handoff.checklist?.length ? handoff.checklist : DEFAULT_CHECKLIST).map((item) => (
                <li key={item.key}>
                  <button
                    type="button"
                    disabled={update.isPending}
                    onClick={() => {
                      setError(null);
                      const nextChecklist = (handoff.checklist?.length ? handoff.checklist : DEFAULT_CHECKLIST).map((c) =>
                        c.key === item.key ? { ...c, done: !c.done } : c
                      );
                      const allDone = nextChecklist.every((c) => c.done);
                      update.mutate(
                        { checklist: nextChecklist, status: allDone ? 'completed' : 'in_progress' },
                        { onError: (e) => setError(getApiErrorMessage(e)) }
                      );
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl border border-ink-100 px-3 py-2.5 text-left text-sm hover:bg-ink-50 disabled:opacity-60 dark:border-ink-800 dark:hover:bg-ink-800/60"
                  >
                    {item.done ? <CheckSquare className="h-4.5 w-4.5 shrink-0 text-emerald-500" /> : <Square className="h-4.5 w-4.5 shrink-0 text-ink-300" />}
                    <span className={item.done ? 'text-ink-400 line-through dark:text-ink-500' : 'text-ink-800 dark:text-ink-100'}>{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-4 border-t border-ink-100 pt-4 dark:border-ink-800">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">Notes</p>
              <textarea
                value={notesDirty ? notes : handoff.notes || ''}
                onChange={(e) => {
                  setNotesDirty(true);
                  setNotes(e.target.value);
                }}
                rows={3}
                className="w-full rounded-control border border-ink-200 bg-white p-3 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
              />
              <Button
                size="sm"
                className="mt-2"
                loading={update.isPending}
                disabled={!notesDirty}
                onClick={() => {
                  setError(null);
                  update.mutate({ notes }, { onSuccess: () => setNotesDirty(false), onError: (e) => setError(getApiErrorMessage(e)) });
                }}
              >
                Save notes
              </Button>
            </div>
          </Card>

          <Card className="p-5">
            <CardHeader title="Handoff details" className="px-0 pt-0" />
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-ink-400 dark:text-ink-500">Start date</dt>
                <dd className="font-semibold text-ink-900 dark:text-white">{handoff.start_date ? format(new Date(handoff.start_date), 'MMM d, yyyy') : '—'}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-ink-400 dark:text-ink-500">Onboarding owner</dt>
                <dd className="flex items-center gap-1.5 font-semibold text-ink-900 dark:text-white">
                  <UserCheck className="h-3.5 w-3.5 text-ink-400" />
                  {handoff.onboarding_owner_name || 'Unassigned'}
                </dd>
              </div>
            </dl>
          </Card>
        </div>
      )}
    </>
  );

  return (
    <ApplicationShell applicationId={applicationId} activeStage="hireHandoff">
      {body}
    </ApplicationShell>
  );
}

export default function HireHandoffPage() {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-ink-300" /></div>}>
      <HireHandoffInner />
    </Suspense>
  );
}
