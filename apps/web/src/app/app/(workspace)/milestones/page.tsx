'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { Check, Circle, Loader2, Plus } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal, ModalHeader } from '@/components/ui/Modal';
import { ProjectShell } from '@/components/projects/ProjectShell';
import { MilestoneStatusBadge } from '@/components/projects/ProjectStatusBadge';
import { useProjectMilestones, useCreateMilestone, useUpdateMilestone } from '@/hooks/projects/useProjectMilestones';
import { useProject } from '@/hooks/projects/useProject';
import type { PmMilestone, PmMilestoneStatus } from '@/hooks/projects/types';
import { getApiErrorMessage } from '@/lib/api';

const STATUS_OPTIONS: PmMilestoneStatus[] = ['draft', 'planned', 'active', 'submitted', 'in_review', 'approved', 'rejected', 'completed', 'cancelled'];

function MilestonesInner() {
  const projectId = useSearchParams().get('projectId') || undefined;
  const [createOpen, setCreateOpen] = useState(false);
  const { data: milestones, isLoading, isError, error } = useProjectMilestones(projectId);
  const { data: project } = useProject(projectId);
  const canManage = project?.myRole === 'owner' || project?.myRole === 'manager';

  return (
    <ProjectShell
      projectId={projectId}
      activeTab="milestones"
      tabCounts={{ milestones: milestones?.length }}
      actions={
        canManage ? (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New milestone
          </Button>
        ) : undefined
      }
    >
      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      )}

      {isError && (
        <Card className="py-14 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Couldn&rsquo;t load milestones</p>
          <p className="mt-1 text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(error)}</p>
        </Card>
      )}

      {!isLoading && !isError && milestones && milestones.length === 0 && (
        <Card className="py-14 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">No milestones yet</p>
          <p className="mt-1 text-sm text-ink-400 dark:text-ink-500">Break the project into milestones to track delivery and payment checkpoints.</p>
        </Card>
      )}

      {!isLoading && !isError && milestones && milestones.length > 0 && (
        <div className="space-y-4">
          <Card className="overflow-x-auto p-5">
            <div className="flex min-w-max items-center">
              {milestones.map((m, i) => (
                <div key={m.id} className="flex items-center">
                  <div className="flex flex-col items-center gap-1.5" style={{ width: 140 }}>
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full ${
                        m.status === 'approved' || m.status === 'completed'
                          ? 'bg-emerald-500 text-white'
                          : m.status === 'active' || m.status === 'in_review' || m.status === 'submitted'
                          ? 'border-2 border-brand-600 text-brand-600'
                          : 'border-2 border-ink-200 text-ink-300 dark:border-ink-700'
                      }`}
                    >
                      {m.status === 'approved' || m.status === 'completed' ? <Check className="h-4 w-4" /> : <Circle className="h-3 w-3 fill-current" />}
                    </span>
                    <span className="text-center text-xs font-semibold text-ink-900 dark:text-white">{m.name}</span>
                    <span className="text-[11px] text-ink-400 dark:text-ink-500">{m.targetDate ? format(new Date(m.targetDate), 'MMM d, yyyy') : 'No date'}</span>
                  </div>
                  {i < milestones.length - 1 && <span className="mx-1 h-px w-10 bg-ink-200 dark:bg-ink-700" />}
                </div>
              ))}
            </div>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader
              title="All milestones"
              className="pb-3"
              action={
                <Link href={`/app/project-payments?projectId=${projectId}`} className="text-xs font-semibold text-brand-600 hover:text-brand-700">
                  Manage milestone payments →
                </Link>
              }
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400 dark:border-ink-800 dark:text-ink-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Milestone</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Due date</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Deliverables</th>
                    <th className="px-4 py-3 font-medium">Tasks</th>
                  </tr>
                </thead>
                <tbody>
                  {milestones.map((m) => (
                    <MilestoneRow key={m.id} milestone={m} projectId={projectId!} />
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {projectId && <CreateMilestoneModal projectId={projectId} open={createOpen} onClose={() => setCreateOpen(false)} />}
    </ProjectShell>
  );
}

function MilestoneRow({ milestone, projectId }: { milestone: PmMilestone; projectId: string }) {
  const updateMilestone = useUpdateMilestone(projectId);

  return (
    <tr className="border-b border-ink-50 last:border-0 hover:bg-ink-50 dark:border-ink-800/60 dark:hover:bg-ink-800/60">
      <td className="px-4 py-3">
        <span className="font-semibold text-ink-900 dark:text-white">{milestone.name}</span>
        {milestone.description && <span className="block max-w-xs truncate text-xs text-ink-400 dark:text-ink-500">{milestone.description}</span>}
      </td>
      <td className="px-4 py-3">
        <select
          value={milestone.status}
          onChange={(e) => updateMilestone.mutate({ milestoneId: milestone.id, patch: { status: e.target.value as PmMilestoneStatus } })}
          className="rounded-lg border border-ink-200 bg-white px-2 py-1 text-xs font-semibold capitalize text-ink-700 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.replace('_', ' ')}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3 text-ink-600 dark:text-ink-300">{milestone.targetDate ? format(new Date(milestone.targetDate), 'MMM d, yyyy') : '—'}</td>
      <td className="px-4 py-3 text-ink-600 dark:text-ink-300">{milestone.amount ? `$${milestone.amount.toLocaleString()}` : '—'}</td>
      <td className="px-4 py-3 text-ink-600 dark:text-ink-300">{milestone.deliverableCount ?? 0}</td>
      <td className="px-4 py-3 text-ink-600 dark:text-ink-300">
        {milestone.taskDoneCount ?? 0}/{milestone.taskCount ?? 0}
      </td>
    </tr>
  );
}

function CreateMilestoneModal({ projectId, open, onClose }: { projectId: string; open: boolean; onClose: () => void }) {
  const createMilestone = useCreateMilestone(projectId);
  const [name, setName] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [amount, setAmount] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await createMilestone.mutateAsync({ name, targetDate: targetDate || undefined, amount: amount ? Number(amount) : undefined });
    setName('');
    setTargetDate('');
    setAmount('');
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy="create-milestone-title" className="max-w-md">
      <ModalHeader title="New milestone" onClose={onClose} />
      <form onSubmit={handleSubmit} className="space-y-3 p-5">
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Name</label>
          <Input data-autofocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Launch & Handoff" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Target date</label>
            <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Amount (optional)</label>
            <Input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={createMilestone.isPending} disabled={!name.trim()}>
            Create milestone
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function MilestonesPage() {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-ink-300" /></div>}>
      <MilestonesInner />
    </Suspense>
  );
}
