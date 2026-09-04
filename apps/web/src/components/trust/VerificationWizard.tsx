'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2, ShieldCheck, UploadCloud } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useStartVerification, useSubmitVerification, useVerificationUploadUrl } from '@/hooks/trust/useTrust';
import { api } from '@/lib/api';

export interface WizardField {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'textarea';
  options?: string[];
  placeholder?: string;
  required?: boolean;
}

export interface WizardStepConfig {
  title: string;
  description?: string;
  fields: WizardField[];
}

export interface VerificationWizardConfig {
  verificationType: 'identity' | 'professional' | 'business' | 'qualification' | 'employment';
  title: string;
  intro: string;
  steps: WizardStepConfig[];
  redactionNotice?: string;
  centreHref: string;
}

function Field({ field, value, onChange }: { field: WizardField; value: string; onChange: (v: string) => void }) {
  if (field.type === 'select') {
    return (
      <select
        className="h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select…</option>
        {field.options?.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    );
  }
  if (field.type === 'textarea') {
    return (
      <textarea
        rows={3}
        className="w-full rounded-lg border border-ink-200 bg-white p-3 text-sm text-ink-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100"
        placeholder={field.placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  return (
    <input
      type={field.type === 'date' ? 'date' : 'text'}
      className="h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100"
      placeholder={field.placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function VerificationWizard({ config }: { config: VerificationWizardConfig }) {
  const totalSteps = config.steps.length + 2; // + evidence step + review/submit step
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [uploadedKeys, setUploadedKeys] = useState<string[]>([]);
  const [result, setResult] = useState<'idle' | 'submitted'>('idle');

  const startVerification = useStartVerification();
  const submitVerification = useSubmitVerification();
  const uploadUrl = useVerificationUploadUrl();

  const isEvidenceStep = step === config.steps.length;
  const isReviewStep = step === config.steps.length + 1;

  async function handleNext() {
    if (step < config.steps.length - 1) {
      setStep((s) => s + 1);
      return;
    }
    if (step === config.steps.length - 1) {
      // Ensure a draft verification exists before moving to evidence upload.
      if (!verificationId) {
        const created = await startVerification.mutateAsync({ verificationType: config.verificationType, claimData: values });
        setVerificationId(created.id);
      }
      setStep((s) => s + 1);
      return;
    }
    if (isEvidenceStep) {
      setStep((s) => s + 1);
      return;
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !verificationId) return;
    const { key, url } = await uploadUrl.mutateAsync({ verificationId, filename: file.name, contentType: file.type });
    await api.put(url, file, { headers: { 'Content-Type': file.type } }).catch(async () => {
      // Fall back to a plain fetch PUT in case axios strips the signed-URL headers.
      await fetch(url, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
    });
    setUploadedKeys((prev) => [...prev, key]);
  }

  async function handleSubmit() {
    if (!verificationId) return;
    await submitVerification.mutateAsync({ verificationId, evidenceReference: uploadedKeys, claimData: values });
    setResult('submitted');
  }

  if (result === 'submitted') {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
        <p className="mt-4 font-display text-lg font-bold text-ink-900 dark:text-white">Verification submitted</p>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
          We&apos;re processing your submission. This can take a few minutes for automated checks, or longer if manual review is required.
        </p>
        <Link href={config.centreHref}>
          <Button className="mt-6">Back to Verification Centre</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 py-6">
      <div>
        <h1 className="font-display text-xl font-bold text-ink-900 dark:text-white">{config.title}</h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{config.intro}</p>
      </div>

      <div className="flex items-center gap-1.5">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-brand-500' : 'bg-ink-100 dark:bg-ink-800'}`} />
        ))}
      </div>

      <Card className="p-6">
        {step < config.steps.length && (
          <div className="space-y-4">
            <div>
              <p className="font-display text-base font-bold text-ink-900 dark:text-white">{config.steps[step].title}</p>
              {config.steps[step].description && <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{config.steps[step].description}</p>}
            </div>
            {config.steps[step].fields.map((field) => (
              <div key={field.key}>
                <label className="mb-1 block text-xs font-semibold text-ink-600 dark:text-ink-300">
                  {field.label}{field.required && <span className="text-red-500"> *</span>}
                </label>
                <Field field={field} value={values[field.key] || ''} onChange={(v) => setValues((prev) => ({ ...prev, [field.key]: v }))} />
              </div>
            ))}
          </div>
        )}

        {isEvidenceStep && (
          <div className="space-y-4">
            <div>
              <p className="font-display text-base font-bold text-ink-900 dark:text-white">Supporting evidence</p>
              <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Upload documents that support your claim. Files are stored securely and are never made public.</p>
            </div>
            {config.redactionNotice && (
              <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">{config.redactionNotice}</div>
            )}
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-ink-200 p-8 text-center hover:border-brand-300 dark:border-ink-700">
              <UploadCloud className="h-6 w-6 text-ink-400" />
              <span className="text-sm font-semibold text-brand-600">Choose a file to upload</span>
              <input type="file" className="hidden" onChange={handleFileChange} />
            </label>
            {uploadedKeys.length > 0 && (
              <ul className="space-y-1 text-sm text-ink-600 dark:text-ink-300">
                {uploadedKeys.map((k) => (
                  <li key={k} className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> {k.split('/').pop()}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {isReviewStep && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-brand-500" />
              <p className="font-display text-base font-bold text-ink-900 dark:text-white">Review and submit</p>
            </div>
            <dl className="space-y-2 text-sm">
              {config.steps.flatMap((s) => s.fields).map((field) => (
                <div key={field.key} className="flex justify-between border-b border-ink-100 pb-1.5 dark:border-ink-800">
                  <dt className="text-ink-400 dark:text-ink-500">{field.label}</dt>
                  <dd className="font-medium text-ink-800 dark:text-ink-100">{values[field.key] || '—'}</dd>
                </div>
              ))}
              <div className="flex justify-between pb-1.5">
                <dt className="text-ink-400 dark:text-ink-500">Evidence files</dt>
                <dd className="font-medium text-ink-800 dark:text-ink-100">{uploadedKeys.length}</dd>
              </div>
            </dl>
            <p className="text-xs text-ink-400 dark:text-ink-500">
              Gigvora verifies the evidence and claims you provide here. This confirms the specified information — it does not guarantee conduct.
            </p>
          </div>
        )}
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        {isReviewStep ? (
          <Button size="sm" onClick={handleSubmit} loading={submitVerification.isPending}>
            Submit verification
          </Button>
        ) : (
          <Button size="sm" onClick={handleNext} loading={startVerification.isPending}>
            Continue <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
