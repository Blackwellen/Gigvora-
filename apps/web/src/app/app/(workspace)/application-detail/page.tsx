'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { Ban, CheckCircle2, FileText, Loader2, MessageSquareText, Sparkles } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ApplicationShell } from '@/components/jobs/ApplicationShell';
import { useApplication, useUpdateApplicationStage } from '@/hooks/jobs/useApplication';
import { getApiErrorMessage } from '@/lib/api';
import type { ApplicationStatus } from '@/hooks/jobs/types';

const NEXT_STAGE: Partial<Record<ApplicationStatus, { status: ApplicationStatus; label: string }>> = {
  submitted: { status: 'reviewing', label: 'Move to screening' },
  reviewing: { status: 'shortlisted', label: 'Shortlist candidate' },
  shortlisted: { status: 'interviewing', label: 'Move to interview' },
  interviewing: { status: 'offered', label: 'Extend offer' },
  offered: { status: 'hired', label: 'Mark hired' },
};

function ApplicationDetailInner() {
  const applicationId = useSearchParams().get('applicationId') || undefined;
  const { data: application } = useApplication(applicationId);
  const advance = useUpdateApplicationStage(applicationId);
  const reject = useUpdateApplicationStage(applicationId);
  const [actionError, setActionError] = useState<string | null>(null);

  const nextStage = application ? NEXT_STAGE[application.status] : undefined;
  const canAct = application?.is_job_owner && application.status !== 'rejected' && application.status !== 'withdrawn' && application.status !== 'hired';

  const candidateName = [application?.candidate?.first_name, application?.candidate?.last_name].filter(Boolean).join(' ') || 'Candidate';

  return (
    <ApplicationShell
      applicationId={applicationId}
      activeStage="overview"
      actions={
        canAct ? (
          <>
            {nextStage && (
              <Button
                size="sm"
                loading={advance.isPending}
                onClick={() => {
                  setActionError(null);
                  advance.mutate({ status: nextStage.status }, { onError: (e) => setActionError(getApiErrorMessage(e)) });
                }}
              >
                <CheckCircle2 className="h-4 w-4" />
                {nextStage.label}
              </Button>
            )}
            <Button
              size="sm"
              variant="danger"
              loading={reject.isPending}
              onClick={() => {
                setActionError(null);
                reject.mutate({ status: 'rejected' }, { onError: (e) => setActionError(getApiErrorMessage(e)) });
              }}
            >
              <Ban className="h-4 w-4" />
              Reject
            </Button>
          </>
        ) : undefined
      }
    >
      {actionError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          {actionError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="p-5">
            <CardHeader title="Résumé & cover letter" className="px-0 pt-0" />
            <div className="mt-3 space-y-3">
              {application?.resume_url ? (
                <a
                  href={application.resume_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-xl border border-ink-100 px-3 py-2.5 text-sm font-semibold text-brand-700 hover:bg-ink-50 dark:border-ink-800 dark:text-brand-400 dark:hover:bg-ink-800/60"
                >
                  <FileText className="h-4 w-4" />
                  View résumé
                </a>
              ) : (
                <p className="text-sm text-ink-400 dark:text-ink-500">No résumé on file.</p>
              )}
              {application?.cover_letter ? (
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">Cover letter</p>
                  <p className="whitespace-pre-wrap text-sm text-ink-700 dark:text-ink-200">{application.cover_letter}</p>
                </div>
              ) : (
                <p className="text-sm text-ink-400 dark:text-ink-500">No cover letter submitted.</p>
              )}
            </div>
          </Card>

          <Card className="p-5">
            <CardHeader title="Screening answers" className="px-0 pt-0" />
            <div className="mt-3 space-y-3">
              {application?.answers && application.answers.length > 0 ? (
                application.answers.map((answer) => (
                  <div key={answer.id} className="rounded-xl border border-ink-100 p-3 dark:border-ink-800">
                    {answer.question_text && <p className="text-xs font-semibold text-ink-500 dark:text-ink-400">{answer.question_text}</p>}
                    <p className="mt-1 text-sm text-ink-800 dark:text-ink-100">{answer.answer_text}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-ink-400 dark:text-ink-500">No screening questions were answered for this application.</p>
              )}
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-2 flex items-center gap-2">
              <MessageSquareText className="h-4 w-4 text-ink-400" />
              <h3 className="text-sm font-bold text-ink-900 dark:text-white">Stage timeline</h3>
            </div>
            <ol className="space-y-3">
              {application?.timeline && application.timeline.length > 0 ? (
                application.timeline.map((event) => (
                  <li key={event.id} className="flex items-start gap-3">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                    <div>
                      <p className="text-sm font-semibold text-ink-900 dark:text-white">{event.label}</p>
                      <p className="text-xs text-ink-400 dark:text-ink-500">{format(new Date(event.occurred_at), 'MMM d, yyyy · h:mm a')}</p>
                      {event.note && <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">{event.note}</p>}
                    </div>
                  </li>
                ))
              ) : (
                <p className="text-sm text-ink-400 dark:text-ink-500">No activity recorded yet.</p>
              )}
            </ol>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <CardHeader title="Candidate" className="px-0 pt-0" />
            <dl className="mt-3 space-y-2 text-sm">
              <Row label="Name" value={candidateName} />
              <Row label="Email" value={application?.candidate?.email || '—'} />
              <Row label="Headline" value={application?.candidate?.headline || '—'} />
            </dl>
          </Card>

          <Card className="p-5">
            <CardHeader title="Job" className="px-0 pt-0" />
            <dl className="mt-3 space-y-2 text-sm">
              <Row label="Title" value={application?.job?.title || '—'} />
              <Row label="Location" value={application?.job?.location || '—'} />
              <Row label="Employment type" value={application?.job?.employment_type?.replace('_', ' ') || '—'} />
              <Row label="Work mode" value={application?.job?.work_mode || '—'} />
            </dl>
            {application?.job_id && (
              <Link href={`/app/job-detail?jobId=${application.job_id}`} className="mt-3 inline-block text-sm font-semibold text-brand-700 hover:underline dark:text-brand-400">
                View job posting →
              </Link>
            )}
          </Card>

          <Card className="p-5">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600" />
              <h3 className="text-sm font-bold text-ink-900 dark:text-white">Match score</h3>
            </div>
            {typeof application?.match_score === 'number' ? (
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold text-ink-900 dark:text-white">{Math.round(application.match_score)}%</span>
                <Badge tone={application.match_score >= 70 ? 'success' : application.match_score >= 40 ? 'warning' : 'danger'}>
                  {application.match_score >= 70 ? 'Strong match' : application.match_score >= 40 ? 'Fair match' : 'Weak match'}
                </Badge>
              </div>
            ) : (
              <p className="text-sm text-ink-400 dark:text-ink-500">No match score computed for this application.</p>
            )}
          </Card>

          <Card className="p-5">
            <CardHeader title="Candidate journey" className="px-0 pt-0" />
            <div className="mt-3 flex flex-col gap-2">
              <Link href={`/app/screening?jobId=${application?.job_id}`}>
                <Button variant="outline" size="sm" className="w-full justify-center">Screening queue</Button>
              </Link>
              <Link href={`/app/assessment?applicationId=${applicationId}`}>
                <Button variant="outline" size="sm" className="w-full justify-center">Assessment</Button>
              </Link>
              <Link href={`/app/interview?applicationId=${applicationId}`}>
                <Button variant="outline" size="sm" className="w-full justify-center">Interview</Button>
              </Link>
              <Link href={`/app/offer?applicationId=${applicationId}`}>
                <Button variant="outline" size="sm" className="w-full justify-center">Offer</Button>
              </Link>
              <Link href={`/app/hire-handoff?applicationId=${applicationId}`}>
                <Button variant="outline" size="sm" className="w-full justify-center">Hire handoff</Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </ApplicationShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-ink-400 dark:text-ink-500">{label}</dt>
      <dd className="truncate text-right font-semibold capitalize text-ink-900 dark:text-white">{value}</dd>
    </div>
  );
}

export default function ApplicationDetailPage() {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-ink-300" /></div>}>
      <ApplicationDetailInner />
    </Suspense>
  );
}
