'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, ClipboardList, Loader2, XCircle } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ApplicationShell } from '@/components/jobs/ApplicationShell';
import { useApplication } from '@/hooks/jobs/useApplication';
import { useAssessment, useAssessmentByApplication, useAssessmentTemplates, useAssignAssessment, useSubmitReviewerNote } from '@/hooks/jobs/useAssessment';
import { getApiErrorMessage } from '@/lib/api';

function AssignAssessmentPanel({ applicationId, jobId }: { applicationId: string; jobId?: string }) {
  const { data: templates, isLoading } = useAssessmentTemplates(jobId);
  const assign = useAssignAssessment(applicationId);
  const [selectedId, setSelectedId] = useState('');
  const [error, setError] = useState<string | null>(null);

  return (
    <Card className="p-6">
      <div className="mb-3 flex items-center gap-2">
        <ClipboardList className="h-4 w-4 text-ink-400" />
        <h3 className="text-sm font-bold text-ink-900 dark:text-white">Assign an assessment</h3>
      </div>
      <p className="mb-3 text-sm text-ink-500 dark:text-ink-400">No assessment has been assigned to this application yet.</p>
      {isLoading && <Loader2 className="h-5 w-5 animate-spin text-ink-300" />}
      {!isLoading && (templates?.length ?? 0) === 0 && (
        <p className="text-sm text-ink-400 dark:text-ink-500">No assessment templates exist for this job yet.</p>
      )}
      {!isLoading && (templates?.length ?? 0) > 0 && (
        <div className="space-y-3">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="h-10 w-full rounded-control border border-ink-200 bg-white px-3 text-sm text-ink-900 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
          >
            <option value="">Select an assessment template…</option>
            {templates?.map((t) => (
              <option key={t.id} value={t.id}>{t.title}{typeof t.passing_score === 'number' ? ` — pass ${t.passing_score}%` : ''}</option>
            ))}
          </select>
          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
          <Button
            size="sm"
            loading={assign.isPending}
            disabled={!selectedId}
            onClick={() => {
              setError(null);
              assign.mutate({ assessmentId: selectedId }, { onError: (e) => setError(getApiErrorMessage(e)) });
            }}
          >
            Assign assessment
          </Button>
        </div>
      )}
    </Card>
  );
}

function AssessmentInner() {
  const params = useSearchParams();
  const applicationId = params.get('applicationId') || undefined;
  const assessmentIdParam = params.get('assessmentId') || undefined;

  const { data: application } = useApplication(applicationId);
  const { data: byApplication, isLoading: byApplicationLoading } = useAssessmentByApplication(applicationId);
  const { data: byId, isLoading: byIdLoading } = useAssessment(!applicationId ? assessmentIdParam : undefined);

  const assignment = applicationId ? byApplication : byId;
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState<string | null>(null);
  const submitNote = useSubmitReviewerNote(assignment?.id, applicationId);

  const body = (
    <>
      {(applicationId ? byApplicationLoading : byIdLoading) && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      )}

      {!(applicationId ? byApplicationLoading : byIdLoading) && !assignment && applicationId && (
        <AssignAssessmentPanel applicationId={applicationId} jobId={application?.job_id} />
      )}

      {!(applicationId ? byApplicationLoading : byIdLoading) && !assignment && !applicationId && (
        <div className="rounded-2xl border border-dashed border-ink-200 py-16 text-center dark:border-ink-700">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">No assessment found</p>
          <p className="text-sm text-ink-400 dark:text-ink-500">Pass ?applicationId= or ?assessmentId= to view an assessment.</p>
        </div>
      )}

      {assignment && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-2">
            <CardHeader title={assignment.assessment?.title || 'Assessment'} className="px-0 pt-0" />
            <div className="mt-3 space-y-2 text-sm text-ink-600 dark:text-ink-300">
              {assignment.assessment?.description && <p>{assignment.assessment.description}</p>}
              <div className="flex flex-wrap gap-2">
                <Badge tone="neutral">Status: {assignment.status.replace('_', ' ')}</Badge>
                {typeof assignment.assessment?.passing_score === 'number' && <Badge tone="neutral">Passing score: {assignment.assessment.passing_score}%</Badge>}
                {typeof assignment.assessment?.time_limit_minutes === 'number' && <Badge tone="neutral">{assignment.assessment.time_limit_minutes} min limit</Badge>}
              </div>
            </div>

            {assignment.result ? (
              <div className="mt-5 border-t border-ink-100 pt-4 dark:border-ink-800">
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold text-ink-900 dark:text-white">{assignment.result.score}%</span>
                  <Badge tone={assignment.result.passed ? 'success' : 'danger'}>
                    {assignment.result.passed ? <CheckCircle2 className="mr-1 h-3 w-3" /> : <XCircle className="mr-1 h-3 w-3" />}
                    {assignment.result.passed ? 'Passed' : 'Failed'}
                  </Badge>
                </div>
                {assignment.result.breakdown && (
                  <ul className="mt-3 space-y-1.5 text-sm">
                    {Object.entries(assignment.result.breakdown).map(([key, value]) => (
                      <li key={key} className="flex items-center justify-between rounded-lg bg-ink-50 px-3 py-1.5 dark:bg-ink-800/60">
                        <span className="capitalize text-ink-600 dark:text-ink-300">{key.replace(/_/g, ' ')}</span>
                        <span className="font-semibold text-ink-900 dark:text-white">{String(value)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <p className="mt-5 border-t border-ink-100 pt-4 text-sm text-ink-400 dark:border-ink-800 dark:text-ink-500">
                Results will appear here once the candidate submits the assessment.
              </p>
            )}
          </Card>

          <Card className="p-5">
            <CardHeader title="Reviewer note" className="px-0 pt-0" />
            <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">{assignment.result?.reviewer_note || 'No reviewer note yet.'}</p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note for the hiring team…"
              rows={4}
              className="mt-3 w-full rounded-control border border-ink-200 bg-white p-3 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
            />
            {noteError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{noteError}</p>}
            <Button
              size="sm"
              className="mt-2"
              loading={submitNote.isPending}
              disabled={!note.trim()}
              onClick={() => {
                setNoteError(null);
                submitNote.mutate(note.trim(), {
                  onSuccess: () => setNote(''),
                  onError: (e) => setNoteError(getApiErrorMessage(e)),
                });
              }}
            >
              Save note
            </Button>
          </Card>
        </div>
      )}
    </>
  );

  if (applicationId) {
    return (
      <ApplicationShell applicationId={applicationId} activeStage="assessment">
        {body}
      </ApplicationShell>
    );
  }

  return <div className="mx-auto max-w-[1400px] space-y-4 px-4 py-5 lg:px-6">{body}</div>;
}

export default function AssessmentPage() {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-ink-300" /></div>}>
      <AssessmentInner />
    </Suspense>
  );
}
