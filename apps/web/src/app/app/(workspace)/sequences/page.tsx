'use client';

import { useMemo, useState } from 'react';
import { ArrowRight, Clock, GitBranch, Linkedin, Loader2, Mail, Plus, Sparkles, Trash2, UserPlus, Workflow } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal, ModalHeader } from '@/components/ui/Modal';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { RecruiterSeatGate } from '@/components/recruiter/RecruiterSeatGate';
import { ProUpgradeBanner } from '@/components/recruiter-pro/ProUpgradeBanner';
import { useRecruiterSeat } from '@/hooks/recruiter/useRecruiterSeat';
import {
  useSequences,
  useSequenceEnrollments,
  useCreateSequence,
  useEnrollCandidateInSequence,
  useAdvanceEnrollment,
} from '@/hooks/recruiter-pro/useSequences';
import type { Sequence, SequenceEnrollment, SequenceStep, SequenceStepType } from '@/hooks/recruiter-pro/types';
import { getApiErrorMessage } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

const STEP_META: Record<SequenceStepType, { icon: typeof Mail; label: string; color: string }> = {
  email: { icon: Mail, label: 'Email', color: 'bg-brand-50 text-brand-700 border-brand-200 dark:bg-brand-500/15 dark:text-brand-400 dark:border-brand-500/30' },
  linkedin: { icon: Linkedin, label: 'LinkedIn', color: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-400 dark:border-sky-500/30' },
  wait: { icon: Clock, label: 'Wait', color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30' },
  branch: { icon: GitBranch, label: 'Branch', color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/15 dark:text-purple-400 dark:border-purple-500/30' },
};

const STATUS_TONE: Record<Sequence['status'], 'neutral' | 'success' | 'warning' | 'brand'> = {
  draft: 'neutral',
  active: 'success',
  paused: 'warning',
  archived: 'neutral',
};

type DraftStep = { key: string; type: SequenceStepType; subject: string; body: string; wait_days: number; branch_condition: string };

function newDraftStep(type: SequenceStepType = 'email'): DraftStep {
  return { key: Math.random().toString(36).slice(2), type, subject: '', body: '', wait_days: 1, branch_condition: '' };
}

function StepBuilder({ steps, onChange }: { steps: DraftStep[]; onChange: (steps: DraftStep[]) => void }) {
  function updateStep(key: string, patch: Partial<DraftStep>) {
    onChange(steps.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  }
  function removeStep(key: string) {
    onChange(steps.filter((s) => s.key !== key));
  }
  function addStep(type: SequenceStepType) {
    onChange([...steps, newDraftStep(type)]);
  }

  return (
    <div className="space-y-3">
      {steps.map((step, idx) => {
        const meta = STEP_META[step.type];
        const Icon = meta.icon;
        return (
          <div key={step.key} className="space-y-2">
            <div className={`rounded-xl border p-3 ${meta.color}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-wide">Step {idx + 1} · {meta.label}</span>
                </div>
                <button type="button" onClick={() => removeStep(step.key)} className="rounded-lg p-1 hover:bg-black/5" aria-label="Remove step">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              {(step.type === 'email' || step.type === 'linkedin') && (
                <div className="mt-2 space-y-2">
                  {step.type === 'email' && (
                    <Input
                      value={step.subject}
                      onChange={(e) => updateStep(step.key, { subject: e.target.value })}
                      placeholder="Subject line"
                      className="bg-white dark:bg-ink-900"
                    />
                  )}
                  <textarea
                    value={step.body}
                    onChange={(e) => updateStep(step.key, { body: e.target.value })}
                    placeholder="Message body"
                    rows={2}
                    className="w-full rounded-control border border-white/60 bg-white p-2 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:bg-ink-900 dark:text-white"
                  />
                </div>
              )}
              {step.type === 'wait' && (
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    value={step.wait_days}
                    onChange={(e) => updateStep(step.key, { wait_days: Number(e.target.value) || 1 })}
                    className="w-24 bg-white dark:bg-ink-900"
                  />
                  <span className="text-xs font-semibold">days before next step</span>
                </div>
              )}
              {step.type === 'branch' && (
                <Input
                  value={step.branch_condition}
                  onChange={(e) => updateStep(step.key, { branch_condition: e.target.value })}
                  placeholder="If candidate replied, skip to..."
                  className="mt-2 bg-white dark:bg-ink-900"
                />
              )}
            </div>
            {idx < steps.length - 1 && <ArrowRight className="mx-auto h-4 w-4 rotate-90 text-ink-300" />}
          </div>
        );
      })}
      <div className="flex flex-wrap gap-2 pt-1">
        {(['email', 'linkedin', 'wait', 'branch'] as SequenceStepType[]).map((type) => {
          const meta = STEP_META[type];
          const Icon = meta.icon;
          return (
            <button
              key={type}
              type="button"
              onClick={() => addStep(type)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-ink-300 px-3 py-1.5 text-xs font-semibold text-ink-600 hover:border-brand-400 hover:text-brand-600 dark:border-ink-700 dark:text-ink-300"
            >
              <Icon className="h-3.5 w-3.5" /> Add {meta.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CreateSequenceModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateSequence();
  const [name, setName] = useState('');
  const [steps, setSteps] = useState<DraftStep[]>([newDraftStep('email')]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    create.mutate(
      {
        name,
        steps: steps.map((s, idx) => ({
          step_order: idx,
          type: s.type,
          template_id: null,
          wait_days: s.type === 'wait' ? s.wait_days : null,
          branch_condition: s.type === 'branch' ? s.branch_condition : null,
        })),
      },
      { onSuccess: () => { onClose(); setName(''); setSteps([newDraftStep('email')]); } }
    );
  }

  return (
    <Modal open={open} onClose={onClose} className="max-w-xl" labelledBy="sequence-create-title">
      <ModalHeader title="New sequence" onClose={onClose} />
      <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-ink-500 dark:text-ink-400">Sequence name</label>
          <Input data-autofocus value={name} onChange={(e) => setName(e.target.value)} required placeholder="Senior engineer outreach" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-ink-500 dark:text-ink-400">Steps</label>
          <StepBuilder steps={steps} onChange={setSteps} />
        </div>
        {create.isError && <p className="text-xs font-semibold text-red-600">{getApiErrorMessage(create.error)}</p>}
        <div className="flex justify-end gap-2 border-t border-ink-100 pt-4 dark:border-ink-800">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={create.isPending} disabled={!name.trim() || steps.length === 0}>Create sequence</Button>
        </div>
      </form>
    </Modal>
  );
}

function EnrollModal({ open, onClose, sequenceId }: { open: boolean; onClose: () => void; sequenceId: string }) {
  const enroll = useEnrollCandidateInSequence();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    enroll.mutate(
      { sequenceId, candidateName: name, candidateEmail: email || undefined },
      { onSuccess: () => { onClose(); setName(''); setEmail(''); } }
    );
  }

  return (
    <Modal open={open} onClose={onClose} className="max-w-md" labelledBy="enroll-title">
      <ModalHeader title="Enroll a candidate" onClose={onClose} />
      <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-ink-500 dark:text-ink-400">Candidate name</label>
          <Input data-autofocus value={name} onChange={(e) => setName(e.target.value)} required placeholder="Jordan Lee" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-ink-500 dark:text-ink-400">Candidate email (optional)</label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jordan@example.com" />
        </div>
        {enroll.isError && <p className="text-xs font-semibold text-red-600">{getApiErrorMessage(enroll.error)}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={enroll.isPending}>Enroll</Button>
        </div>
      </form>
    </Modal>
  );
}

function SequenceDetail({ sequence }: { sequence: Sequence }) {
  const { data: enrollments, isLoading } = useSequenceEnrollments(sequence.id);
  const advance = useAdvanceEnrollment(sequence.id);
  const [enrollOpen, setEnrollOpen] = useState(false);

  const columns: DataTableColumn<SequenceEnrollment>[] = [
    { key: 'candidate_name', header: 'Candidate', render: (row) => <span className="font-semibold text-ink-900 dark:text-white">{row.candidate_name}</span> },
    {
      key: 'progress',
      header: 'Progress',
      render: (row) => (
        <span className="text-ink-600 dark:text-ink-300">
          Step {row.current_step_order} of {row.total_steps}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge tone={row.status === 'completed' ? 'success' : row.status === 'exited' ? 'danger' : row.status === 'paused' ? 'warning' : 'brand'} className="capitalize">
          {row.status}
        </Badge>
      ),
    },
    { key: 'enrolled_at', header: 'Enrolled', render: (row) => formatDistanceToNow(new Date(row.enrolled_at), { addSuffix: true }) },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) =>
        row.status === 'active' ? (
          <Button size="sm" variant="outline" onClick={() => advance.mutate(row.id)} loading={advance.isPending}>
            Advance
          </Button>
        ) : null,
    },
  ];

  return (
    <Card>
      <CardHeader
        title={`Steps (${sequence.steps.length})`}
        action={
          <Button size="sm" onClick={() => setEnrollOpen(true)}>
            <UserPlus className="h-3.5 w-3.5" /> Enroll candidate
          </Button>
        }
      />
      <div className="space-y-2 px-5 pb-4 pt-2">
        {sequence.steps.length === 0 && <p className="text-sm text-ink-400 dark:text-ink-500">No steps yet.</p>}
        {sequence.steps.map((step, idx) => {
          const meta = STEP_META[step.type];
          const Icon = meta.icon;
          return (
            <div key={step.id} className="flex items-center gap-2">
              <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${meta.color}`}>
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="text-sm text-ink-700 dark:text-ink-200">
                {idx + 1}. {meta.label}
                {step.type === 'wait' && step.wait_days ? ` — ${step.wait_days}d` : ''}
                {step.subject ? ` — ${step.subject}` : ''}
              </span>
            </div>
          );
        })}
      </div>
      <div className="border-t border-ink-100 dark:border-ink-800">
        <CardHeader title="Enrollments" className="pt-4" />
        <div className="px-5 pb-5 pt-2">
          <DataTable
            columns={columns}
            data={enrollments || []}
            rowKey={(row) => row.id}
            isLoading={isLoading}
            emptyTitle="No candidates enrolled"
            emptyDescription="Enroll a candidate to start moving them through this sequence."
          />
        </div>
      </div>
      <EnrollModal open={enrollOpen} onClose={() => setEnrollOpen(false)} sequenceId={sequence.id} />
    </Card>
  );
}

function SequencesInner() {
  const { data: seat } = useRecruiterSeat();
  const isPro = seat?.tier === 'pro';
  const { data: sequences, isLoading, isError, error } = useSequences();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const selected = useMemo(() => sequences?.find((s) => s.id === selectedId) || null, [sequences, selectedId]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-4 py-5 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
            <Workflow className="h-5 w-5 text-purple-600" /> Sequences
          </h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Multi-step outreach automations with email, LinkedIn, wait and branch steps.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> New sequence
        </Button>
      </div>

      {!isPro && <ProUpgradeBanner feature="Sequences" />}

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      )}

      {isError && (
        <Card className="py-16 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Couldn&rsquo;t load sequences</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(error)}</p>
        </Card>
      )}

      {sequences && !isLoading && !isError && (
        <>
          {sequences.length === 0 ? (
            <Card className="py-16 text-center">
              <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">No sequences yet</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">Build a multi-step outreach automation to nurture candidates automatically.</p>
              <Button className="mt-4" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> New sequence</Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
              <div className="space-y-2">
                {sequences.map((seq) => (
                  <button
                    key={seq.id}
                    onClick={() => setSelectedId(seq.id)}
                    className={`w-full rounded-xl border p-3 text-left transition-colors ${
                      selectedId === seq.id
                        ? 'border-brand-400 bg-brand-50 dark:border-brand-500 dark:bg-brand-500/10'
                        : 'border-ink-100 bg-white hover:border-ink-200 dark:border-ink-800 dark:bg-ink-900'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-ink-900 dark:text-white">{seq.name}</span>
                      <Badge tone={STATUS_TONE[seq.status]} className="capitalize">{seq.status}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
                      {seq.steps.length} step{seq.steps.length === 1 ? '' : 's'} · {seq.enrollment_count} enrolled
                      {seq.completed_count ? ` · ${seq.completed_count} completed` : ''}
                    </p>
                  </button>
                ))}
              </div>

              <div>
                {selected ? (
                  <SequenceDetail sequence={selected} />
                ) : (
                  <Card className="flex h-full items-center justify-center py-16 text-center">
                    <div>
                      <Sparkles className="mx-auto h-8 w-8 text-ink-300" />
                      <p className="mt-3 text-sm font-semibold text-ink-700 dark:text-ink-200">Select a sequence</p>
                      <p className="mt-1 text-sm text-ink-400 dark:text-ink-500">Pick a sequence on the left to view its steps and enrollments.</p>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          )}
        </>
      )}

      <CreateSequenceModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

export default function SequencesPage() {
  return (
    <RecruiterSeatGate>
      <SequencesInner />
    </RecruiterSeatGate>
  );
}
