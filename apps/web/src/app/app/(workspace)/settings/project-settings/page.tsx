'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ProjectShell } from '@/components/projects/ProjectShell';
import { useProject, useUpdateProject } from '@/hooks/projects/useProject';
import { useProjectMembers } from '@/hooks/projects/useProjectMembers';
import { useArchiveProject, useTransferOwnership, useDeleteProjectAndRedirect } from '@/hooks/projects/useProjectSettings';
import { getApiErrorMessage } from '@/lib/api';

function ProjectSettingsInner() {
  const projectId = useSearchParams().get('projectId') || undefined;
  const { data: project, isLoading } = useProject(projectId);
  const { data: members } = useProjectMembers(projectId);
  const updateProject = useUpdateProject(projectId);
  const archiveProject = useArchiveProject(projectId);
  const transferOwnership = useTransferOwnership(projectId);
  const deleteProject = useDeleteProjectAndRedirect(projectId);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [bidsError, setBidsError] = useState<string | null>(null);

  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description || '');
    }
  }, [project]);

  async function handleSaveGeneral(e: React.FormEvent) {
    e.preventDefault();
    setActionError(null);
    try {
      await updateProject.mutateAsync({ name, description });
    } catch (err) {
      setActionError(getApiErrorMessage(err));
    }
  }

  async function handleTransfer() {
    setActionError(null);
    try {
      await transferOwnership.mutateAsync(transferTo);
      setTransferTo('');
    } catch (err) {
      setActionError(getApiErrorMessage(err));
    }
  }

  const isOwner = project?.myRole === 'owner';
  const canManage = isOwner || project?.myRole === 'manager';
  const otherAcceptedMembers = (members || []).filter((m) => m.role !== 'owner' && m.invitationStatus === 'accepted');

  async function handleToggleOpenToBids() {
    if (!project) return;
    setBidsError(null);
    try {
      await updateProject.mutateAsync({ openToBids: !project.openToBids });
    } catch (err) {
      setBidsError(getApiErrorMessage(err));
    }
  }

  return (
    <ProjectShell projectId={projectId} activeTab="settings">
      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      )}

      {!isLoading && project && (
        <div className="max-w-2xl space-y-4">
          <Card>
            <CardHeader title="General" />
            <form onSubmit={handleSaveGeneral} className="space-y-3 px-5 pb-5 pt-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Project name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} disabled={!isOwner && project.myRole !== 'manager'} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  disabled={!isOwner && project.myRole !== 'manager'}
                  className="w-full rounded-control border border-ink-200 bg-white p-3 text-sm disabled:opacity-60 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
                />
              </div>
              {actionError && <p className="text-sm text-red-600 dark:text-red-400">{actionError}</p>}
              <Button type="submit" size="sm" loading={updateProject.isPending} disabled={!isOwner && project.myRole !== 'manager'}>
                Save changes
              </Button>
            </form>
          </Card>

          {canManage && (
            <Card>
              <CardHeader title="Marketplace visibility" />
              <div className="px-5 pb-5 pt-3">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-ink-100 p-3 dark:border-ink-800">
                  <div>
                    <p className="text-sm font-semibold text-ink-900 dark:text-white">Open to bids</p>
                    <p className="max-w-md text-xs text-ink-400 dark:text-ink-500">
                      When enabled, this project appears in Browse Projects and search results for freelancers who
                      aren&rsquo;t members yet, and they can submit proposals.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={project.openToBids ? 'outline' : 'primary'}
                    onClick={handleToggleOpenToBids}
                    loading={updateProject.isPending}
                  >
                    {project.openToBids ? 'Turn off' : 'Open to bids'}
                  </Button>
                </div>
                {bidsError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{bidsError}</p>}
              </div>
            </Card>
          )}

          {isOwner && (
            <Card className="border-red-200 dark:border-red-500/30">
              <CardHeader title="Danger zone" />
              <div className="space-y-4 px-5 pb-5 pt-3">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-ink-100 p-3 dark:border-ink-800">
                  <div>
                    <p className="text-sm font-semibold text-ink-900 dark:text-white">Archive this project</p>
                    <p className="text-xs text-ink-400 dark:text-ink-500">Hides it from active lists — reversible by re-activating its status.</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => archiveProject.mutate()} loading={archiveProject.isPending}>
                    Archive
                  </Button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-ink-100 p-3 dark:border-ink-800">
                  <div>
                    <p className="text-sm font-semibold text-ink-900 dark:text-white">Transfer ownership</p>
                    <p className="text-xs text-ink-400 dark:text-ink-500">The current owner becomes a manager.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select value={transferTo} onChange={(e) => setTransferTo(e.target.value)} className="h-9 rounded-control border border-ink-200 bg-white px-2 text-sm dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200">
                      <option value="">Select member</option>
                      {otherAcceptedMembers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {`${m.firstName || ''} ${m.lastName || ''}`.trim() || m.role}
                        </option>
                      ))}
                    </select>
                    <Button size="sm" variant="outline" onClick={handleTransfer} disabled={!transferTo} loading={transferOwnership.isPending}>
                      Transfer
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50/50 p-3 dark:border-red-500/30 dark:bg-red-500/10">
                  <div>
                    <p className="text-sm font-semibold text-red-700 dark:text-red-400">Delete this project</p>
                    <p className="text-xs text-red-600/80 dark:text-red-400/70">This permanently removes all tasks, files, and history. This cannot be undone.</p>
                  </div>
                  {confirmDelete ? (
                    <div className="flex gap-2">
                      <Button size="sm" variant="danger" onClick={() => deleteProject.mutate()} loading={deleteProject.isPending}>
                        Confirm delete
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="danger" onClick={() => setConfirmDelete(true)}>
                      Delete project
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </ProjectShell>
  );
}

export default function ProjectSettingsPage() {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-ink-300" /></div>}>
      <ProjectSettingsInner />
    </Suspense>
  );
}
