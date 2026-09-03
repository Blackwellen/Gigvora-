'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronLeft, ChevronRight, FolderPlus } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCreateProject } from '@/hooks/projects/useProjects';
import { getApiErrorMessage } from '@/lib/api';
import type { PmProjectType } from '@/hooks/projects/types';

const STEPS = ['Identity', 'Client & type', 'Dates', 'Review'] as const;

type FormState = {
  name: string;
  description: string;
  projectType: PmProjectType;
  clientName: string;
  startDate: string;
  targetEndDate: string;
};

const INITIAL: FormState = { name: '', description: '', projectType: 'internal', clientName: '', startDate: '', targetEndDate: '' };

export default function CreateProjectPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL);
  const createProject = useCreateProject();

  const canAdvance = step === 0 ? form.name.trim().length > 0 : true;

  async function handleCreate() {
    const project = await createProject.mutateAsync({
      name: form.name,
      description: form.description || undefined,
      projectType: form.projectType,
      clientName: form.clientName || undefined,
      startDate: form.startDate || undefined,
      targetEndDate: form.targetEndDate || undefined,
    });
    router.push(`/app/project-detail/${project.id}`);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-6 lg:px-0">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
          <FolderPlus className="h-5 w-5 text-brand-600" /> Create project
        </h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Set up a new project workspace for your team.</p>
      </div>

      <ol className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                i < step ? 'bg-emerald-500 text-white' : i === step ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-400 dark:bg-ink-800'
              }`}
            >
              {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className={`hidden text-xs font-semibold sm:block ${i === step ? 'text-ink-900 dark:text-white' : 'text-ink-400 dark:text-ink-500'}`}>{label}</span>
            {i < STEPS.length - 1 && <span className="h-px flex-1 bg-ink-100 dark:bg-ink-800" />}
          </li>
        ))}
      </ol>

      <Card className="p-5">
        {step === 0 && (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Project name</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Acme Website Redesign" data-autofocus />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
                placeholder="What is this project about?"
                className="w-full rounded-control border border-ink-200 bg-white p-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Project type</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(['internal', 'client', 'marketplace', 'freelance'] as PmProjectType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setForm({ ...form, projectType: type })}
                    className={`rounded-lg border px-3 py-2 text-sm font-semibold capitalize transition-colors ${
                      form.projectType === type ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-500/60 dark:bg-brand-500/10 dark:text-brand-400' : 'border-ink-200 text-ink-600 hover:bg-ink-50 dark:border-ink-700 dark:text-ink-300'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Client name (optional)</label>
              <Input value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} placeholder="e.g. Acme Corporation" />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Start date</label>
              <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Target end date</label>
              <Input type="date" value={form.targetEndDate} onChange={(e) => setForm({ ...form, targetEndDate: e.target.value })} />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-2 text-sm">
            <ReviewRow label="Name" value={form.name} />
            <ReviewRow label="Type" value={form.projectType} />
            <ReviewRow label="Client" value={form.clientName || '—'} />
            <ReviewRow label="Start date" value={form.startDate || '—'} />
            <ReviewRow label="Target end date" value={form.targetEndDate || '—'} />
            {createProject.isError && <p className="pt-2 text-sm text-red-600 dark:text-red-400">{getApiErrorMessage(createProject.error)}</p>}
          </div>
        )}
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))} disabled={!canAdvance}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleCreate} loading={createProject.isPending}>
            Create project
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
      <span className="font-semibold capitalize text-ink-900 dark:text-white">{value}</span>
    </div>
  );
}
