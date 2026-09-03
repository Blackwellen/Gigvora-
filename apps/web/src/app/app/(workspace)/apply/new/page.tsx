'use client';

import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import { CheckCircle2, ChevronLeft, ChevronRight, FileText, Loader2, Send, ShieldAlert } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { WizardStepper, type WizardStep } from '@/components/wizard/WizardStepper';
import { useJob } from '@/hooks/jobs/useJob';
import { useScreeningQuestions } from '@/hooks/jobs/useScreeningQuestions';
import { useApplyToJob } from '@/hooks/jobs/useApplyToJob';
import { getApiErrorMessage } from '@/lib/api';

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-ink-400 dark:text-ink-500">{hint}</p>}
    </div>
  );
}

type FormState = {
  resumeUrl: string;
  resumeFileName: string;
  coverLetter: string;
  answers: Record<string, string>;
  workAuthorized: string;
  availability: string;
  salaryExpectation: string;
  portfolioLinks: string;
  additionalInfo: string;
};

const INITIAL: FormState = {
  resumeUrl: '',
  resumeFileName: '',
  coverLetter: '',
  answers: {},
  workAuthorized: '',
  availability: '',
  salaryExpectation: '',
  portfolioLinks: '',
  additionalInfo: '',
};

function ApplyInner() {
  const router = useRouter();
  const jobId = useSearchParams().get('jobId') || undefined;
  const { data: job, isLoading: jobLoading, isError: jobError, error: jobErrorObj } = useJob(jobId);
  const { data: questions, isLoading: questionsLoading } = useScreeningQuestions(jobId);
  const applyToJob = useApplyToJob();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<{ id: string } | null>(null);

  const hasQuestions = (questions?.length ?? 0) > 0;

  const STEPS: WizardStep[] = useMemo(() => {
    const base: WizardStep[] = [
      { label: 'Job summary', helper: 'Confirm the role' },
      { label: 'Resume', helper: 'Upload or select' },
      { label: 'Cover letter', helper: 'Introduce yourself' },
    ];
    if (hasQuestions) base.push({ label: 'Screening', helper: 'Job-specific questions' });
    base.push(
      { label: 'Authorization', helper: 'Work status & availability' },
      { label: 'Salary', helper: 'Expected compensation' },
      { label: 'Additional info', helper: 'Portfolio & links' },
      { label: 'Review', helper: 'Submit application' }
    );
    return base;
  }, [hasQuestions]);

  const screeningStepIndex = hasQuestions ? 3 : -1;
  const isReviewStep = step === STEPS.length - 1;

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const canAdvance = useMemo(() => {
    if (step === 1) return form.resumeUrl.trim().length > 0;
    if (step === screeningStepIndex) {
      return (questions || []).every((q) => !q.is_knockout || (form.answers[q.id] || '').trim().length > 0);
    }
    return true;
  }, [step, form, screeningStepIndex, questions]);

  function handleFakeUpload(file: File) {
    // No direct file-upload endpoint is specified in the API contract for applications — this
    // stores the filename as a stand-in resume_url the way a signed-upload flow would resolve to
    // a stored URL. Swap for the real upload endpoint once available.
    set('resumeFileName', file.name);
    set('resumeUrl', `resume://${file.name}`);
  }

  async function handleSubmit() {
    if (!jobId) return;
    setSubmitError(null);
    try {
      const answers = (questions || [])
        .filter((q) => (form.answers[q.id] || '').trim().length > 0)
        .map((q) => ({ question_id: q.id, answer_text: form.answers[q.id] }));

      const extraNotes: string[] = [];
      if (form.workAuthorized) extraNotes.push(`Work authorization: ${form.workAuthorized}`);
      if (form.availability) extraNotes.push(`Availability: ${form.availability}`);
      if (form.salaryExpectation) extraNotes.push(`Salary expectation: ${form.salaryExpectation}`);
      if (form.portfolioLinks) extraNotes.push(`Portfolio: ${form.portfolioLinks}`);
      if (form.additionalInfo) extraNotes.push(`Additional info: ${form.additionalInfo}`);

      const coverLetter = [form.coverLetter.trim(), extraNotes.length ? extraNotes.join('\n') : ''].filter(Boolean).join('\n\n');

      const application = await applyToJob.mutateAsync({
        job_id: jobId,
        resume_url: form.resumeUrl || undefined,
        cover_letter: coverLetter || undefined,
        answers: answers.length ? answers : undefined,
      });
      setSubmitted({ id: application.id });
    } catch (err) {
      setSubmitError(getApiErrorMessage(err));
    }
  }

  if (!jobId) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center lg:px-0">
        <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">No job selected</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">Open a job listing and choose Apply to start an application.</p>
      </div>
    );
  }

  if (jobLoading || questionsLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  if (jobError) {
    const status = axios.isAxiosError(jobErrorObj) ? jobErrorObj.response?.status : undefined;
    const isForbidden = status === 403;
    const isNotFound = status === 404;
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center lg:px-0">
        <div className="mb-2 flex justify-center">{isForbidden && <ShieldAlert className="h-6 w-6 text-amber-500" />}</div>
        <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">
          {isForbidden ? "You don't have access to this job" : isNotFound ? 'Job not found' : "Couldn't load this job"}
        </p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(jobErrorObj, "This job doesn't exist or is no longer available.")}</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center lg:px-0">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-500/15">
          <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h1 className="text-xl font-bold text-ink-900 dark:text-white">Application submitted</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-ink-500 dark:text-ink-400">
          Your application for <span className="font-semibold text-ink-700 dark:text-ink-200">{job?.title}</span> has been sent. You can track its progress any time.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="outline" onClick={() => router.push('/app/job-search')}>
            Browse more jobs
          </Button>
          <Button onClick={() => router.push(`/app/application-detail?applicationId=${submitted.id}`)}>
            Track application <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-6 lg:px-0">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
          <Send className="h-5 w-5 text-brand-600" /> Apply for {job?.title}
        </h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">A few quick steps to submit your application.</p>
      </div>

      <WizardStepper steps={STEPS} currentIndex={step} />

      <Card className="p-5">
        {step === 0 && job && (
          <div className="space-y-3 text-sm">
            <div>
              <h2 className="text-lg font-bold text-ink-900 dark:text-white">{job.title}</h2>
              <p className="mt-1 text-ink-500 dark:text-ink-400">
                {job.location || 'Location not specified'} · <span className="capitalize">{job.work_mode.replace('_', ' ')}</span> ·{' '}
                <span className="capitalize">{job.employment_type.replace('_', ' ')}</span>
              </p>
            </div>
            {(job.salary_min || job.salary_max) && (
              <p className="text-ink-600 dark:text-ink-300">
                {job.salary_currency || 'USD'} {job.salary_min ?? '?'} – {job.salary_max ?? '?'}
              </p>
            )}
            {job.skills && job.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {job.skills.map((s) => (
                  <Badge key={s} tone="neutral">
                    {s}
                  </Badge>
                ))}
              </div>
            )}
            <p className="whitespace-pre-line text-ink-600 dark:text-ink-300">{job.description}</p>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <Field label="Resume" hint="Upload your resume as a PDF or Word document.">
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ink-200 bg-ink-50 px-4 py-8 text-sm font-semibold text-ink-500 hover:border-brand-400 hover:text-brand-600 dark:border-ink-700 dark:bg-ink-800/40 dark:text-ink-400">
                <FileText className="h-5 w-5" />
                {form.resumeFileName ? form.resumeFileName : 'Click to upload your resume'}
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFakeUpload(file);
                  }}
                />
              </label>
            </Field>
            <Field label="Or paste a link to your resume">
              <Input value={form.resumeUrl} onChange={(e) => set('resumeUrl', e.target.value)} placeholder="https://…" />
            </Field>
          </div>
        )}

        {step === 2 && (
          <Field label="Cover letter" hint="Tell the hiring team why you're a great fit.">
            <textarea
              value={form.coverLetter}
              onChange={(e) => set('coverLetter', e.target.value)}
              rows={8}
              placeholder="Dear hiring team,…"
              className="w-full rounded-control border border-ink-200 bg-white p-3 text-sm text-ink-900 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
            />
          </Field>
        )}

        {step === screeningStepIndex && hasQuestions && (
          <div className="space-y-4">
            {(questions || []).map((q) => (
              <Field key={q.id} label={q.question_text + (q.is_knockout ? ' *' : '')}>
                {q.question_type === 'yes_no' ? (
                  <div className="flex gap-2">
                    {['Yes', 'No'].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => set('answers', { ...form.answers, [q.id]: opt })}
                        className={`rounded-lg border px-4 py-2 text-sm font-semibold ${
                          form.answers[q.id] === opt
                            ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-500/60 dark:bg-brand-500/10 dark:text-brand-400'
                            : 'border-ink-200 text-ink-600 hover:bg-ink-50 dark:border-ink-700 dark:text-ink-300'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : q.question_type === 'multiple_choice' && q.options?.length ? (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {q.options.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => set('answers', { ...form.answers, [q.id]: opt })}
                        className={`rounded-lg border px-3 py-2 text-left text-sm font-semibold ${
                          form.answers[q.id] === opt
                            ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-500/60 dark:bg-brand-500/10 dark:text-brand-400'
                            : 'border-ink-200 text-ink-600 hover:bg-ink-50 dark:border-ink-700 dark:text-ink-300'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : q.question_type === 'numeric' ? (
                  <Input
                    type="number"
                    value={form.answers[q.id] || ''}
                    onChange={(e) => set('answers', { ...form.answers, [q.id]: e.target.value })}
                  />
                ) : (
                  <Input value={form.answers[q.id] || ''} onChange={(e) => set('answers', { ...form.answers, [q.id]: e.target.value })} />
                )}
              </Field>
            ))}
          </div>
        )}

        {step === STEPS.findIndex((s) => s.label === 'Authorization') && (
          <div className="space-y-3">
            <Field label="Are you authorized to work in this job's location?">
              <div className="flex gap-2">
                {['Yes', 'No', 'Require sponsorship'].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => set('workAuthorized', opt)}
                    className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                      form.workAuthorized === opt
                        ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-500/60 dark:bg-brand-500/10 dark:text-brand-400'
                        : 'border-ink-200 text-ink-600 hover:bg-ink-50 dark:border-ink-700 dark:text-ink-300'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Availability to start">
              <Input value={form.availability} onChange={(e) => set('availability', e.target.value)} placeholder="e.g. Immediately, 2 weeks notice" />
            </Field>
          </div>
        )}

        {step === STEPS.findIndex((s) => s.label === 'Salary') && (
          <Field label="Salary expectation" hint="Optional, but helps the hiring team gauge fit.">
            <Input value={form.salaryExpectation} onChange={(e) => set('salaryExpectation', e.target.value)} placeholder="e.g. $110,000 – $130,000" />
          </Field>
        )}

        {step === STEPS.findIndex((s) => s.label === 'Additional info') && (
          <div className="space-y-3">
            <Field label="Portfolio / LinkedIn / GitHub links">
              <Input value={form.portfolioLinks} onChange={(e) => set('portfolioLinks', e.target.value)} placeholder="https://…" />
            </Field>
            <Field label="Anything else you'd like to share?">
              <textarea
                value={form.additionalInfo}
                onChange={(e) => set('additionalInfo', e.target.value)}
                rows={4}
                className="w-full rounded-control border border-ink-200 bg-white p-3 text-sm text-ink-900 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
              />
            </Field>
          </div>
        )}

        {isReviewStep && (
          <div className="space-y-2 text-sm">
            <ReviewRow label="Job" value={job?.title || '—'} />
            <ReviewRow label="Resume" value={form.resumeFileName || form.resumeUrl || '—'} />
            <ReviewRow label="Cover letter" value={form.coverLetter ? `${form.coverLetter.slice(0, 60)}…` : '—'} />
            {hasQuestions && <ReviewRow label="Screening answers" value={`${Object.keys(form.answers).length}/${questions?.length}`} />}
            <ReviewRow label="Work authorization" value={form.workAuthorized || '—'} />
            <ReviewRow label="Availability" value={form.availability || '—'} />
            <ReviewRow label="Salary expectation" value={form.salaryExpectation || '—'} />
            {submitError && <p className="pt-2 text-sm text-red-600 dark:text-red-400">{submitError}</p>}
          </div>
        )}
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        {!isReviewStep ? (
          <Button onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))} disabled={!canAdvance}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} loading={applyToJob.isPending}>
            <Send className="h-4 w-4" /> Submit application
          </Button>
        )}
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-ink-100 py-2 last:border-0 dark:border-ink-800">
      <span className="text-ink-500 dark:text-ink-400">{label}</span>
      <span className="max-w-[60%] text-right font-semibold text-ink-900 dark:text-white">{value}</span>
    </div>
  );
}

export default function ApplyPage() {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-ink-300" /></div>}>
      <ApplyInner />
    </Suspense>
  );
}
