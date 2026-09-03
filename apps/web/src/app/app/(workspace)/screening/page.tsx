'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';
import { CheckCircle2, ListChecks, Loader2, Plus, ShieldAlert, ThumbsDown, ThumbsUp } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/jobs/ApplicationShell';
import { useJob } from '@/hooks/jobs/useJob';
import { useScreeningQuestions } from '@/hooks/jobs/useScreeningQuestions';
import { useAddScreeningQuestion, useScreeningQueue, useReviewScreeningApplication } from '@/hooks/jobs/useScreening';
import { getApiErrorMessage } from '@/lib/api';
import type { ScreeningQuestionType } from '@/hooks/jobs/types';

const QUESTION_TYPES: Array<{ value: ScreeningQuestionType; label: string }> = [
  { value: 'text', label: 'Free text' },
  { value: 'yes_no', label: 'Yes / No' },
  { value: 'multiple_choice', label: 'Multiple choice' },
  { value: 'numeric', label: 'Numeric' },
];

function ScreeningInner() {
  const jobId = useSearchParams().get('jobId') || undefined;
  const { data: job, isLoading: jobLoading, isError: jobIsError, error: jobError } = useJob(jobId);
  const { data: questions, isLoading: questionsLoading } = useScreeningQuestions(jobId);
  const { data: queue, isLoading: queueLoading } = useScreeningQueue(jobId);
  const addQuestion = useAddScreeningQuestion(jobId);
  const review = useReviewScreeningApplication(jobId);

  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionType, setNewQuestionType] = useState<ScreeningQuestionType>('text');
  const [newIsKnockout, setNewIsKnockout] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  if (!jobId) {
    return <EmptyState title="No job selected" description="Choose a job from Job Applicants to open its screening workbench." />;
  }

  if (jobLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  if (jobIsError) {
    const status = axios.isAxiosError(jobError) ? jobError.response?.status : undefined;
    const isForbidden = status === 403;
    const isNotFound = status === 404;
    const isTransient = status === 429 || (typeof status === 'number' && status >= 500);
    return (
      <EmptyState
        icon={isForbidden || isTransient ? <ShieldAlert className="h-6 w-6 text-amber-500" /> : undefined}
        title={isForbidden ? "You don't have access to this job's screening queue" : isNotFound ? 'Job not found' : isTransient ? 'Something went wrong' : "Couldn't load this job"}
        description={isTransient ? 'This is likely temporary — please try again in a moment.' : getApiErrorMessage(jobError, "This job doesn't exist or you don't have access to it.")}
      />
    );
  }

  if (!job) return null;

  function submitReview(applicationId: string, decision: 'pass' | 'reject' | 'advance') {
    setReviewError(null);
    setReviewingId(applicationId);
    review.mutate(
      { applicationId, decision },
      {
        onError: (e) => setReviewError(getApiErrorMessage(e)),
        onSettled: () => setReviewingId(null),
      }
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 px-4 py-5 lg:px-6">
      <nav className="text-sm text-ink-400 dark:text-ink-500">
        <Link href={`/app/job-applicants?jobId=${jobId}`} className="hover:underline">
          Job Applicants
        </Link>{' '}
        / <span className="text-ink-600 dark:text-ink-300">Screening</span>
      </nav>
      <div>
        <h1 className="text-xl font-bold text-ink-900 dark:text-white">Screening — {job.title}</h1>
        <p className="mt-0.5 text-sm text-ink-500 dark:text-ink-400">Manage screening questions and review incoming applications.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-1">
          <CardHeader title="Screening questions" className="px-0 pt-0" />
          <div className="mt-3 space-y-2">
            {questionsLoading && <Loader2 className="h-5 w-5 animate-spin text-ink-300" />}
            {!questionsLoading && (questions?.length ?? 0) === 0 && (
              <p className="text-sm text-ink-400 dark:text-ink-500">No screening questions yet — add one below.</p>
            )}
            {questions?.map((q) => (
              <div key={q.id} className="rounded-xl border border-ink-100 p-3 dark:border-ink-800">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-ink-900 dark:text-white">{q.question_text}</p>
                  {q.is_knockout && <Badge tone="danger">Knockout</Badge>}
                </div>
                <p className="mt-1 text-xs capitalize text-ink-400 dark:text-ink-500">{q.question_type.replace('_', ' ')}</p>
              </div>
            ))}
          </div>

          <form
            className="mt-4 space-y-2 border-t border-ink-100 pt-4 dark:border-ink-800"
            onSubmit={(e) => {
              e.preventDefault();
              if (!newQuestionText.trim()) return;
              setAddError(null);
              addQuestion.mutate(
                { question_text: newQuestionText.trim(), question_type: newQuestionType, is_knockout: newIsKnockout },
                {
                  onSuccess: () => {
                    setNewQuestionText('');
                    setNewIsKnockout(false);
                  },
                  onError: (e) => setAddError(getApiErrorMessage(e)),
                }
              );
            }}
          >
            <Input placeholder="New question text" value={newQuestionText} onChange={(e) => setNewQuestionText(e.target.value)} />
            <select
              value={newQuestionType}
              onChange={(e) => setNewQuestionType(e.target.value as ScreeningQuestionType)}
              className="h-10 w-full rounded-control border border-ink-200 bg-white px-3 text-sm text-ink-900 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
            >
              {QUESTION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm text-ink-600 dark:text-ink-300">
              <input type="checkbox" checked={newIsKnockout} onChange={(e) => setNewIsKnockout(e.target.checked)} />
              Knockout question (auto-reject on fail)
            </label>
            {addError && <p className="text-xs text-red-600 dark:text-red-400">{addError}</p>}
            <Button type="submit" size="sm" loading={addQuestion.isPending} disabled={!newQuestionText.trim()}>
              <Plus className="h-4 w-4" />
              Add question
            </Button>
          </form>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-ink-400" />
            <h3 className="text-sm font-bold text-ink-900 dark:text-white">Review queue</h3>
            {queue && <Badge tone="neutral">{queue.length} pending</Badge>}
          </div>
          {reviewError && (
            <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
              {reviewError}
            </div>
          )}
          {queueLoading && (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-ink-300" />
            </div>
          )}
          {!queueLoading && (queue?.length ?? 0) === 0 && (
            <div className="rounded-2xl border border-dashed border-ink-200 py-12 text-center dark:border-ink-700">
              <CheckCircle2 className="mx-auto h-6 w-6 text-emerald-500" />
              <p className="mt-2 text-sm font-semibold text-ink-700 dark:text-ink-200">Queue is clear</p>
              <p className="text-sm text-ink-400 dark:text-ink-500">No applications are waiting on screening review.</p>
            </div>
          )}
          <div className="space-y-2">
            {queue?.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-100 p-3 dark:border-ink-800">
                <div className="flex items-center gap-3">
                  <Avatar name={item.candidate_name} src={item.candidate_avatar_url} size="sm" />
                  <div>
                    <Link href={`/app/application-detail?applicationId=${item.application_id}`} className="text-sm font-semibold text-ink-900 hover:underline dark:text-white">
                      {item.candidate_name}
                    </Link>
                    <div className="flex items-center gap-2 text-xs text-ink-400 dark:text-ink-500">
                      {typeof item.auto_score === 'number' && <span>Auto-score {Math.round(item.auto_score)}%</span>}
                      {typeof item.match_score === 'number' && <span>· Match {Math.round(item.match_score)}%</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    loading={reviewingId === item.application_id && review.isPending}
                    onClick={() => submitReview(item.application_id, 'reject')}
                  >
                    <ThumbsDown className="h-3.5 w-3.5" />
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={reviewingId === item.application_id && review.isPending}
                    onClick={() => submitReview(item.application_id, 'pass')}
                  >
                    <ThumbsUp className="h-3.5 w-3.5" />
                    Pass
                  </Button>
                  <Button
                    size="sm"
                    loading={reviewingId === item.application_id && review.isPending}
                    onClick={() => submitReview(item.application_id, 'advance')}
                  >
                    Advance
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function ScreeningPage() {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-ink-300" /></div>}>
      <ScreeningInner />
    </Suspense>
  );
}
