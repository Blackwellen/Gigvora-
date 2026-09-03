'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import { Archive, Check, Loader2, PauseCircle, PlayCircle, Save, ShieldAlert, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useJob, useUpdateJob } from '@/hooks/jobs/useJob';
import { getApiErrorMessage } from '@/lib/api';
import type { JobEmploymentType, JobInput, JobSeniority, JobStatus, JobWorkMode } from '@/hooks/jobs/types';

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

const STATUS_TONE: Record<JobStatus, 'success' | 'neutral' | 'warning' | 'danger'> = {
  draft: 'neutral',
  open: 'success',
  closed: 'warning',
  archived: 'danger',
};

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-ink-400 dark:text-ink-500">{hint}</p>}
    </div>
  );
}

function ListEditor({ values, onChange, placeholder }: { values: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState('');
  function commit() {
    const trimmed = draft.trim();
    if (trimmed) onChange([...values, trimmed]);
    setDraft('');
  }
  return (
    <div>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
            }
          }}
          placeholder={placeholder}
        />
        <Button type="button" variant="outline" onClick={commit}>
          Add
        </Button>
      </div>
      {values.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {values.map((v, i) => (
            <span key={`${v}-${i}`} className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2.5 py-1 text-xs font-semibold text-ink-700 dark:bg-ink-800 dark:text-ink-200">
              {v}
              <button type="button" onClick={() => onChange(values.filter((_, idx) => idx !== i))} aria-label={`Remove ${v}`}>
                <X className="h-3 w-3 text-ink-400 hover:text-ink-700 dark:hover:text-ink-100" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <h3 className="mb-3 text-sm font-bold text-ink-900 dark:text-white">{title}</h3>
      {children}
    </Card>
  );
}

function EditJobInner() {
  const router = useRouter();
  const jobId = useSearchParams().get('jobId') || undefined;
  const { data: job, isLoading, isError, error } = useJob(jobId);
  const updateJob = useUpdateJob(jobId);

  const [form, setForm] = useState<JobInput | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!job) return;
    setForm({
      title: job.title,
      description: job.description,
      requirements: job.requirements || [],
      location: job.location || '',
      employment_type: job.employment_type,
      work_mode: job.work_mode,
      salary_min: job.salary_min ?? undefined,
      salary_max: job.salary_max ?? undefined,
      salary_currency: job.salary_currency || 'USD',
      skills: job.skills || [],
      status: job.status,
      seniority: job.seniority ?? undefined,
      category: job.category ?? undefined,
      application_deadline: job.application_deadline ?? undefined,
      headcount: job.headcount ?? undefined,
    });
  }, [job]);

  function set<K extends keyof JobInput>(key: K, value: JobInput[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  }

  async function handleSave() {
    if (!form) return;
    setSaveError(null);
    setSaved(false);
    try {
      await updateJob.mutateAsync(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveError(getApiErrorMessage(err));
    }
  }

  async function handleStatusChange(status: JobStatus) {
    setSaveError(null);
    try {
      await updateJob.mutateAsync({ status });
      set('status', status);
    } catch (err) {
      setSaveError(getApiErrorMessage(err));
    }
  }

  if (!jobId) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center lg:px-0">
        <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">No job selected</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">Open a job from Jobs Home or Job Search to edit it.</p>
      </div>
    );
  }

  if (isLoading || !form) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  if (isError) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    const isForbidden = status === 403;
    const isNotFound = status === 404;
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center lg:px-0">
        <div className="mb-2 flex justify-center">{(isForbidden || !isNotFound) && <ShieldAlert className="h-6 w-6 text-amber-500" />}</div>
        <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">
          {isForbidden ? "You don't have access to this job" : isNotFound ? 'Job not found' : "Couldn't load this job"}
        </p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(error, "This job doesn't exist or you don't have access to it.")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 lg:px-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink-900 dark:text-white">Edit job</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-ink-500 dark:text-ink-400">
            {job?.title}
            {job && <Badge tone={STATUS_TONE[job.status]} className="capitalize">{job.status}</Badge>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {job?.status === 'draft' && (
            <Button variant="outline" onClick={() => handleStatusChange('open')} loading={updateJob.isPending}>
              <PlayCircle className="h-4 w-4" /> Publish
            </Button>
          )}
          {job?.status === 'open' && (
            <Button variant="outline" onClick={() => handleStatusChange('closed')} loading={updateJob.isPending}>
              <PauseCircle className="h-4 w-4" /> Close
            </Button>
          )}
          {job?.status === 'closed' && (
            <Button variant="outline" onClick={() => handleStatusChange('open')} loading={updateJob.isPending}>
              <PlayCircle className="h-4 w-4" /> Reopen
            </Button>
          )}
          {job?.status !== 'archived' && (
            <Button variant="outline" onClick={() => handleStatusChange('archived')} loading={updateJob.isPending}>
              <Archive className="h-4 w-4" /> Archive
            </Button>
          )}
          <Button onClick={() => router.push(`/app/job-detail?jobId=${jobId}`)} variant="ghost">
            View listing
          </Button>
        </div>
      </div>

      <Section title="Basics">
        <div className="space-y-3">
          <Field label="Job title">
            <Input value={form.title} onChange={(e) => set('title', e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <Input value={form.category || ''} onChange={(e) => set('category', e.target.value)} />
            </Field>
            <Field label="Seniority">
              <select
                value={form.seniority || ''}
                onChange={(e) => set('seniority', (e.target.value || undefined) as JobSeniority | undefined)}
                className="h-10 w-full rounded-control border border-ink-200 bg-white px-3 text-sm text-ink-900 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
              >
                <option value="">Select…</option>
                {SENIORITIES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Employment type">
            <select
              value={form.employment_type}
              onChange={(e) => set('employment_type', e.target.value as JobEmploymentType)}
              className="h-10 w-full rounded-control border border-ink-200 bg-white px-3 text-sm text-ink-900 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
            >
              {EMPLOYMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      <Section title="Description & requirements">
        <div className="space-y-3">
          <Field label="Description">
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={6}
              className="w-full rounded-control border border-ink-200 bg-white p-3 text-sm text-ink-900 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
            />
          </Field>
          <Field label="Requirements">
            <ListEditor values={form.requirements || []} onChange={(v) => set('requirements', v)} placeholder="Add a requirement and press Enter" />
          </Field>
          <Field label="Skills">
            <ListEditor values={form.skills || []} onChange={(v) => set('skills', v)} placeholder="Add a skill and press Enter" />
          </Field>
        </div>
      </Section>

      <Section title="Location & work mode">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Location">
            <Input value={form.location || ''} onChange={(e) => set('location', e.target.value)} />
          </Field>
          <Field label="Work mode">
            <select
              value={form.work_mode}
              onChange={(e) => set('work_mode', e.target.value as JobWorkMode)}
              className="h-10 w-full rounded-control border border-ink-200 bg-white px-3 text-sm text-ink-900 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
            >
              {WORK_MODES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      <Section title="Compensation">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Minimum salary">
            <Input type="number" value={form.salary_min ?? ''} onChange={(e) => set('salary_min', e.target.value ? Number(e.target.value) : undefined)} />
          </Field>
          <Field label="Maximum salary">
            <Input type="number" value={form.salary_max ?? ''} onChange={(e) => set('salary_max', e.target.value ? Number(e.target.value) : undefined)} />
          </Field>
          <Field label="Currency">
            <Input value={form.salary_currency || ''} onChange={(e) => set('salary_currency', e.target.value.toUpperCase())} maxLength={3} />
          </Field>
        </div>
      </Section>

      <Section title="Application settings">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Application deadline">
            <Input type="date" value={form.application_deadline || ''} onChange={(e) => set('application_deadline', e.target.value)} />
          </Field>
          <Field label="Headcount">
            <Input type="number" min={1} value={form.headcount ?? ''} onChange={(e) => set('headcount', e.target.value ? Number(e.target.value) : undefined)} />
          </Field>
        </div>
      </Section>

      {saveError && <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>}

      <div className="sticky bottom-4 flex items-center justify-end gap-3 rounded-2xl border border-ink-100 bg-white/95 p-3 shadow-floating backdrop-blur dark:border-ink-800 dark:bg-ink-900/95">
        {saved && (
          <span className="flex items-center gap-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            <Check className="h-4 w-4" /> Saved
          </span>
        )}
        <Button onClick={handleSave} loading={updateJob.isPending}>
          <Save className="h-4 w-4" /> Save changes
        </Button>
      </div>
    </div>
  );
}

export default function EditJobPage() {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-ink-300" /></div>}>
      <EditJobInner />
    </Suspense>
  );
}
