'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Loader2, Plus, UserPlus } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Modal, ModalHeader } from '@/components/ui/Modal';
import { ProjectShell } from '@/components/projects/ProjectShell';
import { useProjectMembers } from '@/hooks/projects/useProjectMembers';
import { useProjectPaySplits, useAddPaySplit, useRemovePaySplit } from '@/hooks/projects/useProjectPaySplits';
import { useProject } from '@/hooks/projects/useProject';
import { getApiErrorMessage } from '@/lib/api';

function MembersInner() {
  const projectId = useSearchParams().get('projectId') || undefined;
  const { data: members, isLoading, isError, error } = useProjectMembers(projectId);
  const { data: paySplits } = useProjectPaySplits(projectId);
  const { data: project } = useProject(projectId);
  const canManage = project?.myRole === 'owner' || project?.myRole === 'manager';
  const [splitModalOpen, setSplitModalOpen] = useState(false);
  const removeSplit = useRemovePaySplit(projectId);

  const totalPercentage = (paySplits || []).filter((s) => s.allocationType === 'percentage').reduce((sum, s) => sum + (s.percentage || 0), 0);

  return (
    <ProjectShell
      projectId={projectId}
      activeTab="members"
      tabCounts={{ members: members?.length }}
      actions={
        canManage ? (
          <Link href={`/app/invite-to-project?projectId=${projectId}`}>
            <Button size="sm">
              <UserPlus className="h-4 w-4" /> Invite member
            </Button>
          </Link>
        ) : undefined
      }
    >
      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      )}
      {isError && <Card className="py-14 text-center text-sm text-ink-400">{getApiErrorMessage(error)}</Card>}

      {!isLoading && !isError && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400 dark:border-ink-800 dark:text-ink-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Member</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(members || []).map((m) => (
                    <tr key={m.id} className="border-b border-ink-50 last:border-0 dark:border-ink-800/60">
                      <td className="flex items-center gap-2 px-4 py-3">
                        <Avatar name={`${m.firstName || ''} ${m.lastName || ''}`.trim() || 'Member'} src={m.avatarUrl} size="sm" />
                        <span className="font-medium text-ink-900 dark:text-white">{`${m.firstName || ''} ${m.lastName || ''}`.trim() || 'Member'}</span>
                      </td>
                      <td className="px-4 py-3 capitalize text-ink-600 dark:text-ink-300">{m.role}</td>
                      <td className="px-4 py-3">
                        <Badge tone={m.invitationStatus === 'accepted' ? 'success' : m.invitationStatus === 'pending' ? 'warning' : 'danger'}>{m.invitationStatus}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Pay split"
              action={
                canManage ? (
                  <Button size="sm" variant="outline" onClick={() => setSplitModalOpen(true)}>
                    <Plus className="h-3.5 w-3.5" /> Add split
                  </Button>
                ) : undefined
              }
            />
            <div className="space-y-2 px-5 pb-4 pt-3">
              {(paySplits || []).length === 0 && <p className="text-sm text-ink-400 dark:text-ink-500">No revenue split configured — the full amount goes to the project owner.</p>}
              {(paySplits || []).map((s) => {
                const member = (members || []).find((m) => m.id === s.memberId);
                const name = member ? `${member.firstName || ''} ${member.lastName || ''}`.trim() : 'Member';
                return (
                  <div key={s.id} className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2 dark:border-ink-800">
                    <span className="text-sm font-medium text-ink-900 dark:text-white">{name}</span>
                    <span className="flex items-center gap-2 text-sm">
                      <span className="font-semibold text-brand-600">{s.allocationType === 'percentage' ? `${s.percentage}%` : `$${s.fixedAmount?.toLocaleString()}`}</span>
                      {canManage && (
                        <button type="button" onClick={() => removeSplit.mutate(s.id)} className="text-xs text-ink-400 hover:text-red-600">
                          Remove
                        </button>
                      )}
                    </span>
                  </div>
                );
              })}
              {totalPercentage > 0 && <p className="pt-1 text-xs text-ink-400 dark:text-ink-500">Total allocated: {totalPercentage}% of 100%</p>}
            </div>
          </Card>
        </div>
      )}

      {projectId && <AddPaySplitModal projectId={projectId} open={splitModalOpen} onClose={() => setSplitModalOpen(false)} />}
    </ProjectShell>
  );
}

function AddPaySplitModal({ projectId, open, onClose }: { projectId: string; open: boolean; onClose: () => void }) {
  const { data: members } = useProjectMembers(projectId);
  const addSplit = useAddPaySplit(projectId);
  const [memberId, setMemberId] = useState('');
  const [percentage, setPercentage] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!memberId || !Number(percentage)) return;
    setFormError(null);
    try {
      await addSplit.mutateAsync({ memberId, allocationType: 'percentage', percentage: Number(percentage) });
      setMemberId('');
      setPercentage('');
      onClose();
    } catch (err) {
      setFormError(getApiErrorMessage(err, 'Could not add this pay split.'));
    }
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy="add-split-title" className="max-w-sm">
      <ModalHeader title="Add pay split" onClose={onClose} />
      <form onSubmit={handleSubmit} className="space-y-3 p-5">
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Member</label>
          <select value={memberId} onChange={(e) => setMemberId(e.target.value)} className="h-10 w-full rounded-control border border-ink-200 bg-white px-3 text-sm dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200" required>
            <option value="">Select a member</option>
            {(members || []).map((m) => (
              <option key={m.id} value={m.id}>
                {`${m.firstName || ''} ${m.lastName || ''}`.trim() || m.role}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Percentage</label>
          <Input type="number" min="1" max="100" value={percentage} onChange={(e) => setPercentage(e.target.value)} placeholder="20" />
        </div>
        {formError && <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={addSplit.isPending} disabled={!memberId || !Number(percentage)}>
            Add
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function ProjectMembersPage() {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-ink-300" /></div>}>
      <MembersInner />
    </Suspense>
  );
}
