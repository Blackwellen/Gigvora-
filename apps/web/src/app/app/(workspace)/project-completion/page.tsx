'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProjectShell } from '@/components/projects/ProjectShell';
import { useProjectCompletionChecklist, useCompleteProject } from '@/hooks/projects/useProjectCompletion';
import { getApiErrorMessage } from '@/lib/api';

const CHECK_LABELS: Record<string, string> = {
  outstandingTasks: 'All tasks completed',
  unresolvedIssues: 'No unresolved issues',
  overdueApprovals: 'No pending approvals',
  unacceptedDeliverables: 'All deliverables accepted',
  unapprovedMilestones: 'All milestones approved',
  pendingTimesheets: 'All timesheets finalized',
  pendingPaymentMilestones: 'All payment milestones released',
};

function CompletionInner() {
  const projectId = useSearchParams().get('projectId') || undefined;
  const { data: checklist, isLoading } = useProjectCompletionChecklist(projectId);
  const completeProject = useCompleteProject(projectId);
  const [completionError, setCompletionError] = useState<string | null>(null);

  async function handleComplete() {
    setCompletionError(null);
    try {
      await completeProject.mutateAsync();
    } catch (err) {
      setCompletionError(getApiErrorMessage(err, 'This project still has outstanding items.'));
    }
  }

  return (
    <ProjectShell projectId={projectId} activeTab="completion">
      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      )}

      {!isLoading && checklist && (
        <div className="max-w-2xl space-y-4">
          {checklist.status === 'completed' ? (
            <Card className="border-emerald-200 bg-emerald-50/60 p-5 dark:border-emerald-500/30 dark:bg-emerald-500/10">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <h2 className="text-sm font-bold text-emerald-800 dark:text-emerald-300">Project completed</h2>
              </div>
              {checklist.completedAt && <p className="mt-1 text-sm text-emerald-700/80 dark:text-emerald-400/80">Completed on {new Date(checklist.completedAt).toLocaleDateString()}.</p>}
            </Card>
          ) : (
            <>
              <Card className="p-5">
                <h2 className="mb-3 text-sm font-bold text-ink-900 dark:text-white">Completion checklist</h2>
                <ul className="space-y-2">
                  {Object.entries(checklist.checks).map(([key, count]) => (
                    <li key={key} className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2 dark:border-ink-800">
                      <span className="flex items-center gap-2 text-sm">
                        {count === 0 ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Circle className="h-4 w-4 text-amber-500" />}
                        <span className="text-ink-700 dark:text-ink-300">{CHECK_LABELS[key] || key}</span>
                      </span>
                      {count > 0 && <Badge tone="warning">{count} remaining</Badge>}
                    </li>
                  ))}
                </ul>
              </Card>

              {completionError && <p className="text-sm text-red-600 dark:text-red-400">{completionError}</p>}

              <Button onClick={handleComplete} disabled={!checklist.ready} loading={completeProject.isPending}>
                {checklist.ready ? 'Mark project complete' : 'Resolve outstanding items to complete'}
              </Button>
            </>
          )}
        </div>
      )}
    </ProjectShell>
  );
}

export default function ProjectCompletionPage() {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-ink-300" /></div>}>
      <CompletionInner />
    </Suspense>
  );
}
