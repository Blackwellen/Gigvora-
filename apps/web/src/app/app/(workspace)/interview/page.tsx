'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { CalendarPlus, Loader2, MapPin, Star, Users } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ApplicationShell } from '@/components/jobs/ApplicationShell';
import { useInterview, useInterviewByApplication, useScheduleInterview, useSubmitScorecard } from '@/hooks/jobs/useInterview';
import { getApiErrorMessage } from '@/lib/api';
import type { InterviewFeedbackRow, InterviewRecommendation, InterviewType } from '@/hooks/jobs/types';

const INTERVIEW_TYPES: Array<{ value: InterviewType; label: string }> = [
  { value: 'phone_screen', label: 'Phone screen' },
  { value: 'technical', label: 'Technical' },
  { value: 'onsite', label: 'Onsite' },
  { value: 'panel', label: 'Panel' },
  { value: 'final', label: 'Final' },
];

const RECOMMENDATIONS: Array<{ value: InterviewRecommendation; label: string; tone: 'success' | 'brand' | 'neutral' | 'warning' | 'danger' }> = [
  { value: 'strong_yes', label: 'Strong yes', tone: 'success' },
  { value: 'yes', label: 'Yes', tone: 'brand' },
  { value: 'neutral', label: 'Neutral', tone: 'neutral' },
  { value: 'no', label: 'No', tone: 'warning' },
  { value: 'strong_no', label: 'Strong no', tone: 'danger' },
];

function ScheduleInterviewForm({ applicationId }: { applicationId: string }) {
  const schedule = useScheduleInterview(applicationId);
  const [type, setType] = useState<InterviewType>('phone_screen');
  const [scheduledAt, setScheduledAt] = useState('');
  const [duration, setDuration] = useState('30');
  const [location, setLocation] = useState('');
  const [interviewers, setInterviewers] = useState('');
  const [error, setError] = useState<string | null>(null);

  return (
    <Card className="p-6">
      <div className="mb-3 flex items-center gap-2">
        <CalendarPlus className="h-4 w-4 text-ink-400" />
        <h3 className="text-sm font-bold text-ink-900 dark:text-white">Schedule an interview</h3>
      </div>
      <form
        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!scheduledAt) return;
          setError(null);
          schedule.mutate(
            {
              type,
              scheduledAt: new Date(scheduledAt).toISOString(),
              durationMinutes: Number(duration) || 30,
              locationOrLink: location || undefined,
              interviewers: interviewers
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            },
            { onError: (err) => setError(getApiErrorMessage(err)) }
          );
        }}
      >
        <label className="text-sm">
          <span className="mb-1 block font-medium text-ink-600 dark:text-ink-300">Interview type</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as InterviewType)}
            className="h-10 w-full rounded-control border border-ink-200 bg-white px-3 text-sm text-ink-900 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
          >
            {INTERVIEW_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-ink-600 dark:text-ink-300">Date & time</span>
          <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} required />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-ink-600 dark:text-ink-300">Duration (minutes)</span>
          <Input type="number" min={15} step={15} value={duration} onChange={(e) => setDuration(e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-ink-600 dark:text-ink-300">Location or link</span>
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Zoom link or office address" />
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block font-medium text-ink-600 dark:text-ink-300">Interviewers (comma-separated)</span>
          <Input value={interviewers} onChange={(e) => setInterviewers(e.target.value)} placeholder="Jane Doe, John Smith" />
        </label>
        {error && <p className="text-xs text-red-600 dark:text-red-400 sm:col-span-2">{error}</p>}
        <div className="sm:col-span-2">
          <Button type="submit" loading={schedule.isPending} disabled={!scheduledAt}>
            Schedule interview
          </Button>
        </div>
      </form>
    </Card>
  );
}

function ScorecardForm({ interviewId, applicationId }: { interviewId: string; applicationId?: string }) {
  const submitScorecard = useSubmitScorecard(interviewId, applicationId);
  const [overallRating, setOverallRating] = useState(3);
  const [recommendation, setRecommendation] = useState<InterviewRecommendation>('neutral');
  const [rows, setRows] = useState<InterviewFeedbackRow[]>([{ criterion: 'Communication', rating: 3, comments: '' }]);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function updateRow(i: number, patch: Partial<InterviewFeedbackRow>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  return (
    <Card className="p-5">
      <CardHeader title="Submit scorecard" className="px-0 pt-0" />
      {submitted ? (
        <p className="mt-3 text-sm font-semibold text-emerald-600 dark:text-emerald-400">Scorecard submitted. Thank you.</p>
      ) : (
        <div className="mt-3 space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink-600 dark:text-ink-300">Overall rating (1–5)</span>
            <Input type="number" min={1} max={5} value={overallRating} onChange={(e) => setOverallRating(Number(e.target.value))} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink-600 dark:text-ink-300">Recommendation</span>
            <select
              value={recommendation}
              onChange={(e) => setRecommendation(e.target.value as InterviewRecommendation)}
              className="h-10 w-full rounded-control border border-ink-200 bg-white px-3 text-sm text-ink-900 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
            >
              {RECOMMENDATIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </label>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">Criteria</p>
            {rows.map((row, i) => (
              <div key={i} className="grid grid-cols-1 gap-2 rounded-xl border border-ink-100 p-3 sm:grid-cols-[1fr,80px] dark:border-ink-800">
                <div className="space-y-2">
                  <Input value={row.criterion} onChange={(e) => updateRow(i, { criterion: e.target.value })} placeholder="Criterion (e.g. Problem solving)" />
                  <Input value={row.comments || ''} onChange={(e) => updateRow(i, { comments: e.target.value })} placeholder="Comments" />
                </div>
                <Input type="number" min={1} max={5} value={row.rating} onChange={(e) => updateRow(i, { rating: Number(e.target.value) })} />
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRows((prev) => [...prev, { criterion: '', rating: 3, comments: '' }])}
            >
              Add criterion
            </Button>
          </div>

          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
          <Button
            size="sm"
            loading={submitScorecard.isPending}
            onClick={() => {
              setError(null);
              submitScorecard.mutate(
                { overallRating, recommendation, feedback: rows.filter((r) => r.criterion.trim()) },
                {
                  onSuccess: () => setSubmitted(true),
                  onError: (e) => setError(getApiErrorMessage(e)),
                }
              );
            }}
          >
            Submit scorecard
          </Button>
        </div>
      )}
    </Card>
  );
}

function InterviewInner() {
  const params = useSearchParams();
  const applicationId = params.get('applicationId') || undefined;
  const interviewIdParam = params.get('interviewId') || undefined;

  const { data: byApplication, isLoading: byApplicationLoading } = useInterviewByApplication(applicationId);
  const { data: byId, isLoading: byIdLoading } = useInterview(!applicationId ? interviewIdParam : undefined);
  const interview = applicationId ? byApplication : byId;
  const loading = applicationId ? byApplicationLoading : byIdLoading;

  const body = (
    <>
      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      )}

      {!loading && !interview && applicationId && <ScheduleInterviewForm applicationId={applicationId} />}

      {!loading && !interview && !applicationId && (
        <div className="rounded-2xl border border-dashed border-ink-200 py-16 text-center dark:border-ink-700">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">No interview found</p>
          <p className="text-sm text-ink-400 dark:text-ink-500">Pass ?applicationId= or ?interviewId= to view an interview.</p>
        </div>
      )}

      {interview && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-2">
            <CardHeader title="Interview details" className="px-0 pt-0" />
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="brand" className="capitalize">{interview.type.replace('_', ' ')}</Badge>
                <Badge tone={interview.status === 'completed' ? 'success' : interview.status === 'cancelled' || interview.status === 'no_show' ? 'danger' : 'neutral'} className="capitalize">
                  {interview.status.replace('_', ' ')}
                </Badge>
                {interview.round_number && <Badge tone="neutral">Round {interview.round_number}</Badge>}
              </div>
              <p className="flex items-center gap-2 text-ink-700 dark:text-ink-200">
                <CalendarPlus className="h-4 w-4 text-ink-400" />
                {format(new Date(interview.scheduled_at), 'MMM d, yyyy · h:mm a')} · {interview.duration_minutes} min
              </p>
              {interview.location_or_link && (
                <p className="flex items-center gap-2 text-ink-700 dark:text-ink-200">
                  <MapPin className="h-4 w-4 text-ink-400" />
                  {interview.location_or_link}
                </p>
              )}
              {interview.interviewers && interview.interviewers.length > 0 && (
                <p className="flex items-center gap-2 text-ink-700 dark:text-ink-200">
                  <Users className="h-4 w-4 text-ink-400" />
                  {interview.interviewers.map((i) => i.name).join(', ')}
                </p>
              )}
            </div>

            <div className="mt-5 border-t border-ink-100 pt-4 dark:border-ink-800">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">Submitted scorecards</p>
              {(interview.scorecards?.length ?? 0) === 0 ? (
                <p className="text-sm text-ink-400 dark:text-ink-500">No scorecards submitted yet.</p>
              ) : (
                <div className="space-y-2">
                  {interview.scorecards!.map((sc) => (
                    <div key={sc.id} className="rounded-xl border border-ink-100 p-3 dark:border-ink-800">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-ink-900 dark:text-white">{sc.interviewer_name || 'Interviewer'}</p>
                        <span className="flex items-center gap-1 text-sm font-semibold text-amber-500">
                          <Star className="h-3.5 w-3.5 fill-current" /> {sc.overall_rating}
                        </span>
                      </div>
                      <Badge tone={RECOMMENDATIONS.find((r) => r.value === sc.recommendation)?.tone || 'neutral'} className="mt-1 capitalize">
                        {sc.recommendation.replace('_', ' ')}
                      </Badge>
                      {sc.feedback.length > 0 && (
                        <ul className="mt-2 space-y-1 text-xs text-ink-500 dark:text-ink-400">
                          {sc.feedback.map((f, i) => (
                            <li key={i}>
                              <span className="font-semibold text-ink-700 dark:text-ink-200">{f.criterion}:</span> {f.rating}/5 {f.comments && `— ${f.comments}`}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          <ScorecardForm interviewId={interview.id} applicationId={applicationId} />
        </div>
      )}
    </>
  );

  if (applicationId) {
    return (
      <ApplicationShell applicationId={applicationId} activeStage="interview">
        {body}
      </ApplicationShell>
    );
  }

  return <div className="mx-auto max-w-[1400px] space-y-4 px-4 py-5 lg:px-6">{body}</div>;
}

export default function InterviewPage() {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-ink-300" /></div>}>
      <InterviewInner />
    </Suspense>
  );
}
