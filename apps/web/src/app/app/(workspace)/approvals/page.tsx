'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProjectShell } from '@/components/projects/ProjectShell';
import { useProjectApprovals, useDecideApproval } from '@/hooks/projects/useProjectApprovals';
import { useSession } from '@/lib/session/SessionContext';
import { getApiErrorMessage } from '@/lib/api';

const STATUS_TONE: Record<string, 'neutral' | 'warning' | 'success' | 'danger'> = { pending: 'warning', approved: 'success', rejected: 'danger', cancelled: 'neutral' };

const OBJECT_LABEL: Record<string, string> = {
  deliverable: 'Deliverable',
  milestone: 'Milestone',
  file: 'File',
  change_request: 'Change Request',
  payment_release: 'Payment Release',
  timesheet: 'Timesheet',
  project_completion: 'Project Completion',
};

function ApprovalsInner() {
  const projectId = useSearchParams().get('projectId') || undefined;
  const { user } = useSession();
  const { data: approvals, isLoading, isError, error } = useProjectApprovals(projectId);
  const decide = useDecideApproval(projectId);

  return (
    <ProjectShell projectId={projectId} activeTab="approvals" tabCounts={{ approvals: approvals?.filter((a) => a.status === 'pending').length }}>
      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      )}
      {isError && <Card className="py-14 text-center text-sm text-ink-400">{getApiErrorMessage(error)}</Card>}
      {!isLoading && !isError && (approvals || []).length === 0 && (
        <Card className="py-14 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">No approval requests yet</p>
          <p className="mt-1 text-sm text-ink-400 dark:text-ink-500">Deliverables, milestones, and payment releases can all be routed through an approval here.</p>
        </Card>
      )}

      <div className="space-y-2">
        {(approvals || []).map((a) => {
          const myStep = a.steps.find((s) => s.approverId === user?.id);
          const canDecide = a.status === 'pending' && myStep?.decision === 'pending';
          return (
            <Card key={a.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-ink-900 dark:text-white">
                    {OBJECT_LABEL[a.objectType] || a.objectType} approval · <span className="capitalize text-ink-500 dark:text-ink-400">{a.mode}</span>
                  </p>
                  <p className="text-xs text-ink-400 dark:text-ink-500">Requested {format(new Date(a.createdAt), 'MMM d, yyyy')}</p>
                </div>
                <Badge tone={STATUS_TONE[a.status]}>{a.status}</Badge>
              </div>

              <ul className="mt-3 space-y-1.5">
                {a.steps.map((s) => (
                  <li key={s.id} className="flex items-center justify-between text-xs">
                    <span className="text-ink-500 dark:text-ink-400">Approver {s.stepOrder + 1}</span>
                    <Badge tone={s.decision === 'pending' ? 'neutral' : s.decision === 'approved' ? 'success' : 'danger'}>{s.decision}</Badge>
                  </li>
                ))}
              </ul>

              {canDecide && (
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => decide.mutate({ approvalId: a.id, decision: 'approved' })} loading={decide.isPending}>
                    Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => decide.mutate({ approvalId: a.id, decision: 'rejected' })} loading={decide.isPending}>
                    Reject
                  </Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </ProjectShell>
  );
}

export default function ApprovalsPage() {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-ink-300" /></div>}>
      <ApprovalsInner />
    </Suspense>
  );
}
