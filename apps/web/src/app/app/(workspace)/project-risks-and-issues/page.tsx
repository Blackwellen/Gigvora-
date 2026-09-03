'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, Plus } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { Modal, ModalHeader } from '@/components/ui/Modal';
import { ProjectShell } from '@/components/projects/ProjectShell';
import { useProjectRisks, useCreateRisk, useUpdateRisk } from '@/hooks/projects/useProjectRisks';
import type { PmRiskKind, PmRiskSeverity, PmRiskStatus } from '@/hooks/projects/types';
import { getApiErrorMessage } from '@/lib/api';

const SEVERITY_TONE: Record<PmRiskSeverity, 'neutral' | 'warning' | 'danger'> = { low: 'neutral', medium: 'warning', high: 'danger', critical: 'danger' };
const KIND_TABS = [
  { key: 'risk', label: 'Risks' },
  { key: 'issue', label: 'Issues' },
] as const;

function RisksInner() {
  const projectId = useSearchParams().get('projectId') || undefined;
  const [kind, setKind] = useState<PmRiskKind>('risk');
  const [createOpen, setCreateOpen] = useState(false);
  const { data: items, isLoading, isError, error } = useProjectRisks(projectId, kind);
  const updateRisk = useUpdateRisk(projectId);

  return (
    <ProjectShell
      projectId={projectId}
      activeTab="risks"
      tabCounts={{ risks: items?.filter((i) => i.status === 'open').length }}
      actions={
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Log {kind}
        </Button>
      }
    >
      <Tabs tabs={KIND_TABS.map((t) => ({ ...t }))} value={kind} onChange={(k) => setKind(k as PmRiskKind)} className="mb-3" />

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      )}
      {isError && <Card className="py-14 text-center text-sm text-ink-400">{getApiErrorMessage(error)}</Card>}
      {!isLoading && !isError && (items || []).length === 0 && (
        <Card className="py-14 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Nothing logged yet</p>
          <p className="mt-1 text-sm text-ink-400 dark:text-ink-500">
            {kind === 'risk' ? 'A risk is an uncertain future event that could affect delivery.' : 'An issue is an existing problem already affecting the project.'}
          </p>
        </Card>
      )}

      <div className="space-y-2">
        {(items || []).map((item) => (
          <Card key={item.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-ink-900 dark:text-white">{item.title}</h3>
                {item.description && <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{item.description}</p>}
                {item.financialExposure !== null && <p className="mt-1 text-xs text-ink-400 dark:text-ink-500">Financial exposure: ${item.financialExposure.toLocaleString()}</p>}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <Badge tone={SEVERITY_TONE[item.severity]} className="capitalize">
                  {item.severity}
                </Badge>
                <select
                  value={item.status}
                  onChange={(e) => updateRisk.mutate({ riskId: item.id, patch: { status: e.target.value as PmRiskStatus } })}
                  className="rounded-lg border border-ink-200 bg-white px-2 py-1 text-xs font-semibold capitalize text-ink-700 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200"
                >
                  {['open', 'mitigating', 'resolved', 'accepted', 'escalated'].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {item.mitigation && <p className="mt-2 text-xs text-ink-500 dark:text-ink-400">Mitigation: {item.mitigation}</p>}
          </Card>
        ))}
      </div>

      {projectId && <CreateRiskModal projectId={projectId} kind={kind} open={createOpen} onClose={() => setCreateOpen(false)} />}
    </ProjectShell>
  );
}

function CreateRiskModal({ projectId, kind, open, onClose }: { projectId: string; kind: PmRiskKind; open: boolean; onClose: () => void }) {
  const createRisk = useCreateRisk(projectId);
  const [title, setTitle] = useState('');
  const [severity, setSeverity] = useState<PmRiskSeverity>('medium');
  const [mitigation, setMitigation] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await createRisk.mutateAsync({ kind, title, severity, mitigation: mitigation || undefined });
    setTitle('');
    setMitigation('');
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy="create-risk-title" className="max-w-md">
      <ModalHeader title={`Log ${kind}`} onClose={onClose} />
      <form onSubmit={handleSubmit} className="space-y-3 p-5">
        <Input data-autofocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" required />
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Severity</label>
          <select value={severity} onChange={(e) => setSeverity(e.target.value as PmRiskSeverity)} className="h-10 w-full rounded-control border border-ink-200 bg-white px-3 text-sm dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200">
            {['low', 'medium', 'high', 'critical'].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <textarea
          value={mitigation}
          onChange={(e) => setMitigation(e.target.value)}
          rows={2}
          placeholder="Mitigation plan (optional)"
          className="w-full rounded-control border border-ink-200 bg-white p-3 text-sm dark:border-ink-700 dark:bg-ink-900 dark:text-white"
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={createRisk.isPending} disabled={!title.trim()}>
            Log {kind}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function ProjectRisksAndIssuesPage() {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-ink-300" /></div>}>
      <RisksInner />
    </Suspense>
  );
}
