'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { Loader2, Plus } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal, ModalHeader } from '@/components/ui/Modal';
import { ProjectShell } from '@/components/projects/ProjectShell';
import { DeliverableStatusBadge } from '@/components/projects/ProjectStatusBadge';
import { useProjectDeliverables, useCreateDeliverable, useUpdateDeliverable } from '@/hooks/projects/useProjectDeliverables';
import { useProjectMilestones } from '@/hooks/projects/useProjectMilestones';
import { useProject } from '@/hooks/projects/useProject';
import type { PmDeliverable } from '@/hooks/projects/types';
import { getApiErrorMessage } from '@/lib/api';

function DeliverablesInner() {
  const projectId = useSearchParams().get('projectId') || undefined;
  const [createOpen, setCreateOpen] = useState(false);
  const { data: deliverables, isLoading, isError, error } = useProjectDeliverables(projectId);
  const { data: milestones } = useProjectMilestones(projectId);
  const { data: project } = useProject(projectId);
  const canManage = project?.myRole === 'owner' || project?.myRole === 'manager';
  const milestoneNameById = new Map((milestones || []).map((m) => [m.id, m.name]));

  return (
    <ProjectShell
      projectId={projectId}
      activeTab="deliverables"
      tabCounts={{ deliverables: deliverables?.length }}
      actions={
        canManage ? (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New deliverable
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
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Couldn&rsquo;t load deliverables</p>
          <p className="mt-1 text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(error)}</p>
        </Card>
      )}

      {!isLoading && !isError && deliverables && deliverables.length === 0 && (
        <Card className="py-14 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">No deliverables yet</p>
          <p className="mt-1 text-sm text-ink-400 dark:text-ink-500">Deliverables track what gets submitted, reviewed, and accepted for this project.</p>
        </Card>
      )}

      {!isLoading && !isError && deliverables && deliverables.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {deliverables.map((d) => (
            <DeliverableCard key={d.id} deliverable={d} projectId={projectId!} canManage={canManage} milestoneName={d.milestoneId ? milestoneNameById.get(d.milestoneId) : undefined} />
          ))}
        </div>
      )}

      {projectId && <CreateDeliverableModal projectId={projectId} open={createOpen} onClose={() => setCreateOpen(false)} />}
    </ProjectShell>
  );
}

function DeliverableCard({ deliverable, projectId, canManage, milestoneName }: { deliverable: PmDeliverable; projectId: string; canManage: boolean; milestoneName?: string }) {
  const updateDeliverable = useUpdateDeliverable(projectId);

  return (
    <Card className="flex flex-col gap-2 p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink-900 dark:text-white">{deliverable.title}</h3>
        <DeliverableStatusBadge status={deliverable.status} />
      </div>
      {deliverable.description && <p className="line-clamp-2 text-xs text-ink-500 dark:text-ink-400">{deliverable.description}</p>}
      <div className="mt-1 flex items-center justify-between text-xs text-ink-400 dark:text-ink-500">
        <span>{milestoneName ? `Milestone: ${milestoneName}` : 'No milestone'}</span>
        <span>{deliverable.dueDate ? format(new Date(deliverable.dueDate), 'MMM d, yyyy') : 'No due date'}</span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        {deliverable.status === 'pending' && (
          <Button size="sm" variant="outline" onClick={() => updateDeliverable.mutate({ deliverableId: deliverable.id, patch: { status: 'submitted' } })} loading={updateDeliverable.isPending}>
            Submit
          </Button>
        )}
        {canManage && (deliverable.status === 'submitted' || deliverable.status === 'in_review') && (
          <>
            <Button size="sm" onClick={() => updateDeliverable.mutate({ deliverableId: deliverable.id, patch: { status: 'accepted' } })} loading={updateDeliverable.isPending}>
              Accept
            </Button>
            <Button size="sm" variant="outline" onClick={() => updateDeliverable.mutate({ deliverableId: deliverable.id, patch: { status: 'rejected' } })} loading={updateDeliverable.isPending}>
              Reject
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}

function CreateDeliverableModal({ projectId, open, onClose }: { projectId: string; open: boolean; onClose: () => void }) {
  const createDeliverable = useCreateDeliverable(projectId);
  const { data: milestones } = useProjectMilestones(projectId);
  const [title, setTitle] = useState('');
  const [milestoneId, setMilestoneId] = useState('');
  const [dueDate, setDueDate] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await createDeliverable.mutateAsync({ title, milestoneId: milestoneId || undefined, dueDate: dueDate || undefined });
    setTitle('');
    setMilestoneId('');
    setDueDate('');
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy="create-deliverable-title" className="max-w-md">
      <ModalHeader title="New deliverable" onClose={onClose} />
      <form onSubmit={handleSubmit} className="space-y-3 p-5">
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Title</label>
          <Input data-autofocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Homepage Design Package" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Milestone (optional)</label>
            <select
              value={milestoneId}
              onChange={(e) => setMilestoneId(e.target.value)}
              className="h-10 w-full rounded-control border border-ink-200 bg-white px-3 text-sm dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200"
            >
              <option value="">No milestone</option>
              {(milestones || []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Due date</label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={createDeliverable.isPending} disabled={!title.trim()}>
            Create deliverable
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function DeliverablesPage() {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-ink-300" /></div>}>
      <DeliverablesInner />
    </Suspense>
  );
}
