'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Briefcase,
  Check,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Plus,
  Rocket,
  Trash2,
  X,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CategorySelect } from '@/components/ui/CategorySelect';
import { CountrySelect } from '@/components/ui/CountrySelect';
import { TagPicker } from '@/components/ui/TagPicker';
import { WizardStepper, type WizardStep } from '@/components/wizard/WizardStepper';
import { useCreateJob, useAddScreeningQuestion } from '@/hooks/jobs/useCreateJob';
import { api, getApiErrorMessage } from '@/lib/api';
import type {
  JobEmploymentType,
  JobSeniority,
  JobWorkMode,
  ScreeningQuestionType,
} from '@/hooks/jobs/types';

const STEPS: WizardStep[] = [
  { label: 'Basics', helper: 'Title, category, level' },
  { label: 'Description', helper: 'What the role involves' },
  { label: 'Requirements', helper: 'Skills & must-haves' },
  { label: 'Location', helper: 'Where the work happens' },
  { label: 'Compensation', helper: 'Salary & benefits' },
  { label: 'Screening', helper: 'Applicant questions' },
  { label: 'Settings', helper: 'Deadline & headcount' },
  { label: 'Team', helper: 'Hiring manager' },
  { label: 'Promote', helper: 'Sponsor this job' },
  { label: 'Review', helper: 'Publish the listing' },
];

const EMPLOYMENT_TYPES: { value: JobEmploymentType; label: string }[] = [
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' },
  { value: 'temporary', label: 'Temporary' },
];

const SENIORITIES: { value: JobSeniority; label: string }[] = [
  { value: 'entry', label: 'Entry-level' },
  { value: 'mid', label: 'Mid-level' },
  { value: 'senior', label: 'Senior' },
  { value: 'lead', label: 'Lead' },
  { value: 'principal', label: 'Principal' },
  { value: 'executive', label: 'Executive' },
];

const WORK_MODES: { value: JobWorkMode; label: string }[] = [
  { value: 'onsite', label: 'On-site' },
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
];

const QUESTION_TYPES: { value: ScreeningQuestionType; label: string }[] = [
  { value: 'text', label: 'Free text' },
  { value: 'yes_no', label: 'Yes / No' },
  { value: 'multiple_choice', label: 'Multiple choice' },
  { value: 'numeric', label: 'Numeric' },
];

type DraftQuestion = {
  question_text: string;
  question_type: ScreeningQuestionType;
  is_knockout: boolean;
  options: string;
};

type FormState = {
  title: string;
  category: string;
  seniority: JobSeniority | '';
  employmentType: JobEmploymentType;
  description: string;
  responsibilities: string[];
  requirements: string[];
  skillsRequired: string[];
  skillsNiceToHave: string[];
  location: string;
  countryCode: string;
  workMode: JobWorkMode;
  salaryMin: string;
  salaryMax: string;
  salaryCurrency: string;
  benefits: string[];
  questions: DraftQuestion[];
  applicationDeadline: string;
  headcount: string;
  hiringManager: string;
  promote: boolean;
};

const INITIAL: FormState = {
  title: '',
  category: '',
  seniority: '',
  employmentType: 'full_time',
  description: '',
  responsibilities: [],
  requirements: [],
  skillsRequired: [],
  skillsNiceToHave: [],
  location: '',
  countryCode: '',
  workMode: 'onsite',
  salaryMin: '',
  salaryMax: '',
  salaryCurrency: 'USD',
  benefits: [],
  questions: [],
  applicationDeadline: '',
  headcount: '1',
  hiringManager: '',
  promote: false,
};

function TagInput({
  values,
  onAdd,
  onRemove,
  placeholder,
}: {
  values: string[];
  onAdd: (value: string) => void;
  onRemove: (index: number) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState('');
  function commit() {
    const trimmed = draft.trim();
    if (trimmed) onAdd(trimmed);
    setDraft('');
  }
  return (
    <div>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              commit();
            }
          }}
          placeholder={placeholder}
        />
        <Button type="button" variant="outline" size="md" onClick={commit}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {values.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {values.map((v, i) => (
            <span
              key={`${v}-${i}`}
              className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2.5 py-1 text-xs font-semibold text-ink-700 dark:bg-ink-800 dark:text-ink-200"
            >
              {v}
              <button type="button" onClick={() => onRemove(i)} aria-label={`Remove ${v}`}>
                <X className="h-3 w-3 text-ink-400 hover:text-ink-700 dark:hover:text-ink-100" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-ink-400 dark:text-ink-500">{hint}</p>}
    </div>
  );
}

export default function CreateJobPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const createJob = useCreateJob();
  const addScreeningQuestion = useAddScreeningQuestion();
  const [isPublishing, setIsPublishing] = useState(false);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const canAdvance = useMemo(() => {
    switch (step) {
      case 0:
        return form.title.trim().length > 0 && form.category.trim().length > 0;
      case 1:
        return form.description.trim().length >= 20;
      case 3:
        return form.location.trim().length > 0;
      default:
        return true;
    }
  }, [step, form]);

  function composeDescription() {
    let text = form.description.trim();
    if (form.responsibilities.length) {
      text += `\n\nKey responsibilities:\n${form.responsibilities.map((r) => `- ${r}`).join('\n')}`;
    }
    if (form.benefits.length) {
      text += `\n\nBenefits:\n${form.benefits.map((b) => `- ${b}`).join('\n')}`;
    }
    return text;
  }

  async function handlePublish(publish: boolean) {
    setSubmitError(null);
    try {
      const job = await createJob.mutateAsync({
        title: form.title.trim(),
        description: composeDescription(),
        requirements: form.requirements.length ? form.requirements : undefined,
        location: form.location.trim(),
        country_code: form.countryCode || undefined,
        employment_type: form.employmentType,
        work_mode: form.workMode,
        salary_min: form.salaryMin ? Number(form.salaryMin) : undefined,
        salary_max: form.salaryMax ? Number(form.salaryMax) : undefined,
        salary_currency: form.salaryCurrency || undefined,
        skills: [...form.skillsRequired, ...form.skillsNiceToHave],
        category: form.category.trim() || undefined,
        seniority: form.seniority || undefined,
        application_deadline: form.applicationDeadline || undefined,
        headcount: form.headcount ? Number(form.headcount) : undefined,
        status: 'draft',
      });

      // Screening questions key off the real job id, so they're created right after — best-effort,
      // a failure here shouldn't block the job itself from being created/published.
      for (const q of form.questions) {
        if (!q.question_text.trim()) continue;
        try {
          await addScreeningQuestion.mutateAsync({
            jobId: job.id,
            input: {
              question_text: q.question_text.trim(),
              question_type: q.question_type,
              is_knockout: q.is_knockout,
              options: q.question_type === 'multiple_choice' ? q.options.split(',').map((o) => o.trim()).filter(Boolean) : undefined,
            },
          });
        } catch {
          // non-fatal — keep going
        }
      }

      if (publish) {
        setIsPublishing(true);
        await api.patch(`/jobs/${job.id}`, { status: 'open' });
      }

      if (form.promote) {
        router.push(`/app/sponsored-job-setup/new?jobId=${job.id}`);
      } else {
        router.push(`/app/job-detail?jobId=${job.id}`);
      }
    } catch (err) {
      setSubmitError(getApiErrorMessage(err));
    } finally {
      setIsPublishing(false);
    }
  }

  const isLastStep = step === STEPS.length - 1;
  const isSubmitting = createJob.isPending || isPublishing;

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 lg:px-0">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
          <Briefcase className="h-5 w-5 text-brand-600" /> Post a job
        </h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Build out the listing step by step — you can save as a draft at any point.</p>
      </div>

      <WizardStepper steps={STEPS} currentIndex={step} />

      <Card className="p-5">
        {step === 0 && (
          <div className="space-y-3">
            <Field label="Job title">
              <Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Senior Product Designer" data-autofocus />
            </Field>
            <Field label="Category">
              <CategorySelect value={form.category || null} onChange={(v) => set('category', v || '')} allowEmpty={false} />
            </Field>
            <Field label="Seniority">
              <div className="grid grid-cols-3 gap-2">
                {SENIORITIES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => set('seniority', s.value)}
                    className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                      form.seniority === s.value
                        ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-500/60 dark:bg-brand-500/10 dark:text-brand-400'
                        : 'border-ink-200 text-ink-600 hover:bg-ink-50 dark:border-ink-700 dark:text-ink-300'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Employment type">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {EMPLOYMENT_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => set('employmentType', t.value)}
                    className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                      form.employmentType === t.value
                        ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-500/60 dark:bg-brand-500/10 dark:text-brand-400'
                        : 'border-ink-200 text-ink-600 hover:bg-ink-50 dark:border-ink-700 dark:text-ink-300'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <Field label="Description" hint="At least 20 characters — describe the role, the team, and what success looks like.">
              <textarea
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                rows={6}
                placeholder="Describe the role, team, and impact this hire will have..."
                className="w-full rounded-control border border-ink-200 bg-white p-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
              />
            </Field>
            <Field label="Key responsibilities">
              <TagInput
                values={form.responsibilities}
                onAdd={(v) => set('responsibilities', [...form.responsibilities, v])}
                onRemove={(i) => set('responsibilities', form.responsibilities.filter((_, idx) => idx !== i))}
                placeholder="Add a responsibility and press Enter"
              />
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <Field label="Required skills">
              <TagPicker
                value={form.skillsRequired}
                onChange={(v) => set('skillsRequired', v)}
                placeholder="e.g. React, Figma, SQL"
              />
            </Field>
            <Field label="Nice-to-have skills">
              <TagPicker
                value={form.skillsNiceToHave}
                onChange={(v) => set('skillsNiceToHave', v)}
                placeholder="e.g. GraphQL, Motion design"
              />
            </Field>
            <Field label="Other requirements">
              <TagInput
                values={form.requirements}
                onAdd={(v) => set('requirements', [...form.requirements, v])}
                onRemove={(i) => set('requirements', form.requirements.filter((_, idx) => idx !== i))}
                placeholder="e.g. 5+ years experience, degree preferred"
              />
            </Field>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <Field label="Location">
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <Input value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="e.g. New York, NY" className="pl-9" />
              </div>
            </Field>
            <Field label="Country">
              <CountrySelect value={form.countryCode || null} onChange={(v) => set('countryCode', v || '')} emptyLabel="Select a country" />
            </Field>
            <Field label="Work mode">
              <div className="grid grid-cols-3 gap-2">
                {WORK_MODES.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => set('workMode', m.value)}
                    className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                      form.workMode === m.value
                        ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-500/60 dark:bg-brand-500/10 dark:text-brand-400'
                        : 'border-ink-200 text-ink-600 hover:bg-ink-50 dark:border-ink-700 dark:text-ink-300'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <Field label="Minimum salary">
                <Input type="number" value={form.salaryMin} onChange={(e) => set('salaryMin', e.target.value)} placeholder="e.g. 90000" />
              </Field>
              <Field label="Maximum salary">
                <Input type="number" value={form.salaryMax} onChange={(e) => set('salaryMax', e.target.value)} placeholder="e.g. 120000" />
              </Field>
              <Field label="Currency">
                <Input value={form.salaryCurrency} onChange={(e) => set('salaryCurrency', e.target.value.toUpperCase())} placeholder="USD" maxLength={3} />
              </Field>
            </div>
            <Field label="Benefits">
              <TagInput
                values={form.benefits}
                onAdd={(v) => set('benefits', [...form.benefits, v])}
                onRemove={(i) => set('benefits', form.benefits.filter((_, idx) => idx !== i))}
                placeholder="e.g. Health insurance, 401k match, unlimited PTO"
              />
            </Field>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-3">
            <p className="text-sm text-ink-500 dark:text-ink-400">
              Add screening questions applicants must answer. Mark a question as a knockout to auto-filter candidates who fail it.
            </p>
            {form.questions.map((q, i) => (
              <div key={i} className="space-y-2 rounded-xl border border-ink-100 p-3 dark:border-ink-800">
                <div className="flex items-center gap-2">
                  <Input
                    value={q.question_text}
                    onChange={(e) => {
                      const next = [...form.questions];
                      next[i] = { ...q, question_text: e.target.value };
                      set('questions', next);
                    }}
                    placeholder="e.g. Do you have 3+ years of React experience?"
                    className="flex-1"
                  />
                  <button type="button" onClick={() => set('questions', form.questions.filter((_, idx) => idx !== i))} aria-label="Remove question">
                    <Trash2 className="h-4 w-4 text-ink-400 hover:text-red-600" />
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={q.question_type}
                    onChange={(e) => {
                      const next = [...form.questions];
                      next[i] = { ...q, question_type: e.target.value as ScreeningQuestionType };
                      set('questions', next);
                    }}
                    className="h-9 rounded-control border border-ink-200 bg-white px-2 text-xs font-semibold text-ink-700 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200"
                  >
                    {QUESTION_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  {q.question_type === 'multiple_choice' && (
                    <Input
                      value={q.options}
                      onChange={(e) => {
                        const next = [...form.questions];
                        next[i] = { ...q, options: e.target.value };
                        set('questions', next);
                      }}
                      placeholder="Comma-separated options"
                      className="h-9 flex-1 text-xs"
                    />
                  )}
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-ink-600 dark:text-ink-300">
                    <input
                      type="checkbox"
                      checked={q.is_knockout}
                      onChange={(e) => {
                        const next = [...form.questions];
                        next[i] = { ...q, is_knockout: e.target.checked };
                        set('questions', next);
                      }}
                    />
                    Knockout question
                  </label>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                set('questions', [...form.questions, { question_text: '', question_type: 'text', is_knockout: false, options: '' }])
              }
            >
              <Plus className="h-4 w-4" /> Add question
            </Button>
          </div>
        )}

        {step === 6 && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Application deadline">
              <Input type="date" value={form.applicationDeadline} onChange={(e) => set('applicationDeadline', e.target.value)} />
            </Field>
            <Field label="Headcount">
              <Input type="number" min={1} value={form.headcount} onChange={(e) => set('headcount', e.target.value)} />
            </Field>
          </div>
        )}

        {step === 7 && (
          <div className="space-y-3">
            <Field label="Hiring manager / point of contact" hint="For your reference — the job stays owned by your account either way.">
              <Input value={form.hiringManager} onChange={(e) => set('hiringManager', e.target.value)} placeholder="e.g. Jamie Chen" />
            </Field>
          </div>
        )}

        {step === 8 && (
          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-xl border border-purple-200 bg-purple-50 p-4 dark:border-purple-500/30 dark:bg-purple-500/10">
              <Rocket className="mt-0.5 h-5 w-5 shrink-0 text-purple-600 dark:text-purple-400" />
              <div>
                <p className="text-sm font-semibold text-ink-900 dark:text-white">Promote this job</p>
                <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
                  Sponsor this listing to reach more candidates faster. You'll set a budget and targeting after the job is created.
                </p>
                <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-ink-700 dark:text-ink-200">
                  <input type="checkbox" checked={form.promote} onChange={(e) => set('promote', e.target.checked)} />
                  Take me to sponsorship setup after publishing
                </label>
              </div>
            </div>
          </div>
        )}

        {step === 9 && (
          <div className="space-y-2 text-sm">
            <ReviewRow label="Title" value={form.title} />
            <ReviewRow label="Category" value={form.category || '—'} />
            <ReviewRow label="Seniority" value={SENIORITIES.find((s) => s.value === form.seniority)?.label || '—'} />
            <ReviewRow label="Employment type" value={EMPLOYMENT_TYPES.find((t) => t.value === form.employmentType)?.label || '—'} />
            <ReviewRow label="Location" value={form.location || '—'} />
            <ReviewRow label="Country" value={form.countryCode || '—'} />
            <ReviewRow label="Work mode" value={WORK_MODES.find((m) => m.value === form.workMode)?.label || '—'} />
            <ReviewRow
              label="Salary"
              value={form.salaryMin || form.salaryMax ? `${form.salaryCurrency} ${form.salaryMin || '?'} – ${form.salaryMax || '?'}` : '—'}
            />
            <ReviewRow label="Skills" value={[...form.skillsRequired, ...form.skillsNiceToHave].join(', ') || '—'} />
            <ReviewRow label="Screening questions" value={String(form.questions.length)} />
            <ReviewRow label="Application deadline" value={form.applicationDeadline || '—'} />
            <ReviewRow label="Headcount" value={form.headcount || '1'} />
            {form.promote && <Badge tone="brand">Will route to sponsorship setup</Badge>}
            {submitError && <p className="pt-2 text-sm text-red-600 dark:text-red-400">{submitError}</p>}
          </div>
        )}
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex gap-2">
          {isLastStep && (
            <Button variant="outline" onClick={() => handlePublish(false)} loading={isSubmitting}>
              Save as draft
            </Button>
          )}
          {!isLastStep ? (
            <Button onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))} disabled={!canAdvance}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={() => handlePublish(true)} loading={isSubmitting}>
              <Check className="h-4 w-4" /> Publish job
            </Button>
          )}
        </div>
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
