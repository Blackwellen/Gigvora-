'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { Loader2, Plus } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal, ModalHeader } from '@/components/ui/Modal';
import { ProjectShell } from '@/components/projects/ProjectShell';
import { useProjectChangeRequests, useCreateChangeRequest, useUpdateChangeRequestStatus } from '@/hooks/projects/useProjectChangeRequests';
import type { PmChangeRequestStatus } from '@/hooks/projects/types';
import { getApiErrorMessage } from '@/lib/api';

const STATUS_TONE: Record<PmChangeRequestStatus, 'neutral' | 'warning' | 'success' | 'danger' | 'brand'> = {
  draft: 'neutral',
  submitted: 'warning',
  under_review: 'warning',
  needs_information: 'warning',
  approved: 'success',
  rejected: 'danger',
  implemented: 'brand',
  cancelled: 'neutral',
};

const NEXT_STATUS: Partial<Record<PmChangeRequestStatus, PmChangeRequestStatus[]>> = {
  draft: ['submitted'],
  submitted: ['under_review'],
  under_review: ['approved', 'rejected', 'needs_information'],
  needs_information: ['under_review'],
  approved: ['implemented'],
};

function ChangeRequestsInner() {
  const projectId = useSearchParams().get('projectId') || undefined;
  const [createOpen, setCreateOpen] = useState(false);
  const { data: changeRequests, isLoading, isError, error } = useProjectChangeRequests(projectId);
  const updateStatus = useUpdateChangeRequestStatus(projectId);

  return (
    <ProjectShell
      projectId={projectId}
      activeTab="changeRequests"
      tabCounts={{ changeRequests: changeRequests?.length }}
      actions={
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> New change request
        </Button>
      }
    >
      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      )}
      {isError && <Card className="py-14 text-center text-sm text-ink-400">{getApiErrorMessage(error)}</Card>}
      {!isLoading && !isError && (changeRequests || []).length === 0 && (
        <Card className="py-14 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">No change requests yet</p>
          <p className="mt-1 text-sm text-ink-400 dark:text-ink-500">Scope, budget, or timeline changes are tracked and approved here before anything else updates.</p>
        </Card>
      )}

      <div className="space-y-2">
        {(changeRequests || []).map((cr) => (
          <Card key={cr.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-ink-900 dark:text-white">{cr.title}</h3>
                <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{cr.description}</p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-ink-400 dark:text-ink-500">
                  {cr.dateImpactDays !== null && <span>Schedule: +{cr.dateImpactDays}d</span>}
                  {cr.costImpact !== null && <span>Cost: ${cr.costImpact.toLocaleString()}</span>}
                  <span>Requested {format(new Date(cr.createdAt), 'MMM d, yyyy')}</span>
                </div>
              </div>
              <Badge tone={STATUS_TONE[cr.status]} className="capitalize">
                {cr.status.replace('_', ' ')}
              </Badge>
            </div>
            {(NEXT_STATUS[cr.status] || []).length > 0 && (
              <div className="mt-3 flex gap-1.5">
                {NEXT_STATUS[cr.status]!.map((next) => (
                  <Button key={next} size="sm" variant={next === 'rejected' ? 'outline' : 'primary'} onClick={() => updateStatus.mutate({ changeRequestId: cr.id, status: next })} loading={updateStatus.isPending}>
                    {next.replace('_', ' ')}
                  </Button>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>

      {projectId && <CreateChangeRequestModal projectId={projectId} open={createOpen} onClose={() => setCreateOpen(false)} />}
    </ProjectShell>
  );
}

function CreateChangeRequestModal({ projectId, open, onClose }: { projectId: string; open: boolean; onClose: () => void }) {
  const createChangeRequest = useCreateChangeRequest(projectId);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [costImpact, setCostImpact] = useState('');
  const [dateImpactDays, setDateImpactDays] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    await createChangeRequest.mutateAsync({ title, description, costImpact: costImpact ? Number(costImpact) : undefined, dateImpactDays: dateImpactDays ? Number(dateImpactDays) : undefined });
    setTitle('');
    setDescription('');
    setCostImpact('');
    setDateImpactDays('');
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy="create-cr-title" className="max-w-md">
      <ModalHeader title="New change request" onClose={onClose} />
      <form onSubmit={handleSubmit} className="space-y-3 p-5">
        <Input data-autofocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" required />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Describe the requested change and why it's needed"
          className="w-full rounded-control border border-ink-200 bg-white p-3 text-sm dark:border-ink-700 dark:bg-ink-900 dark:text-white"
          required
        />
        <div className="grid grid-cols-2 gap-3">
          <Input type="number" placeholder="Cost impact ($)" value={costImpact} onChange={(e) => setCostImpact(e.target.value)} />
          <Input type="number" placeholder="Date impact (days)" value={dateImpactDays} onChange={(e) => setDateImpactDays(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={createChangeRequest.isPending} disabled={!title.trim() || !description.trim()}>
            Create
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function ChangeRequestsPage() {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-ink-300" /></div>}>
      <ChangeRequestsInner />
    </Suspense>
  );
}
