'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal, ModalHeader } from '@/components/ui/Modal';
import { ProjectShell } from '@/components/projects/ProjectShell';
import { useProjectDependencies, useCreateDependency, useDeleteDependency } from '@/hooks/projects/useProjectDependencies';
import { useProjectTasks } from '@/hooks/projects/useProjectTasks';
import { getApiErrorMessage } from '@/lib/api';

function DependenciesInner() {
  const projectId = useSearchParams().get('projectId') || undefined;
  const { data: dependencies, isLoading, isError, error } = useProjectDependencies(projectId);
  const { data: tasks } = useProjectTasks(projectId);
  const deleteDependency = useDeleteDependency(projectId);
  const [createOpen, setCreateOpen] = useState(false);

  const taskById = new Map((tasks || []).map((t) => [t.id, t.title]));

  return (
    <ProjectShell
      projectId={projectId}
      activeTab="dependencies"
      tabCounts={{ dependencies: dependencies?.length }}
      actions={
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Add dependency
        </Button>
      }
    >
      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      )}
      {isError && <Card className="py-14 text-center text-sm text-ink-400">{getApiErrorMessage(error)}</Card>}
      {!isLoading && !isError && (dependencies || []).length === 0 && (
        <Card className="py-14 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">No dependencies mapped yet</p>
          <p className="mt-1 text-sm text-ink-400 dark:text-ink-500">Link tasks that block each other to see the critical chain and at-risk timeline.</p>
        </Card>
      )}

      {!isLoading && !isError && (dependencies || []).length > 0 && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400 dark:border-ink-800 dark:text-ink-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Task</th>
                  <th className="px-4 py-3 font-medium">Depends on</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {(dependencies || []).map((d) => (
                  <tr key={d.id} className="border-b border-ink-50 last:border-0 dark:border-ink-800/60">
                    <td className="px-4 py-3 font-medium text-ink-900 dark:text-white">{taskById.get(d.taskId) || 'Unknown task'}</td>
                    <td className="px-4 py-3 text-ink-600 dark:text-ink-300">{taskById.get(d.dependsOnTaskId) || 'Unknown task'}</td>
                    <td className="px-4 py-3 text-ink-500 dark:text-ink-400">{d.dependencyType.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" onClick={() => deleteDependency.mutate(d.id)} aria-label="Remove dependency" className="rounded-lg p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {projectId && <CreateDependencyModal projectId={projectId} open={createOpen} onClose={() => setCreateOpen(false)} />}
    </ProjectShell>
  );
}

function CreateDependencyModal({ projectId, open, onClose }: { projectId: string; open: boolean; onClose: () => void }) {
  const { data: tasks } = useProjectTasks(projectId);
  const createDependency = useCreateDependency(projectId);
  const [taskId, setTaskId] = useState('');
  const [dependsOnTaskId, setDependsOnTaskId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!taskId || !dependsOnTaskId || taskId === dependsOnTaskId) return;
    setFormError(null);
    try {
      await createDependency.mutateAsync({ taskId, dependsOnTaskId });
      setTaskId('');
      setDependsOnTaskId('');
      onClose();
    } catch (err) {
      setFormError(getApiErrorMessage(err, 'This dependency could not be created.'));
    }
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy="create-dependency-title" className="max-w-sm">
      <ModalHeader title="Add dependency" onClose={onClose} />
      <form onSubmit={handleSubmit} className="space-y-3 p-5">
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Task</label>
          <select value={taskId} onChange={(e) => setTaskId(e.target.value)} className="h-10 w-full rounded-control border border-ink-200 bg-white px-3 text-sm dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200" required>
            <option value="">Select a task</option>
            {(tasks || []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Depends on</label>
          <select value={dependsOnTaskId} onChange={(e) => setDependsOnTaskId(e.target.value)} className="h-10 w-full rounded-control border border-ink-200 bg-white px-3 text-sm dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200" required>
            <option value="">Select a task</option>
            {(tasks || []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </div>
        {formError && <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={createDependency.isPending} disabled={!taskId || !dependsOnTaskId || taskId === dependsOnTaskId}>
            Add
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function ProjectDependenciesPage() {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-ink-300" /></div>}>
      <DependenciesInner />
    </Suspense>
  );
}
