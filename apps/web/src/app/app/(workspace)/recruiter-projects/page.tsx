'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { AlertTriangle, Bot, FolderKanban, Link2, Loader2, Sparkles, Users } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal, ModalHeader } from '@/components/ui/Modal';
import { KpiCard, KpiGrid } from '@/components/ui/KpiCard';
import { RecruiterSeatGate } from '@/components/recruiter/RecruiterSeatGate';
import { ProUpgradeBanner } from '@/components/recruiter-pro/ProUpgradeBanner';
import { useRecruiterSeat } from '@/hooks/recruiter/useRecruiterSeat';
import { useCreateRecruiterProject, useRecruiterProjects } from '@/hooks/recruiter/useRecruiterProjects';
import type { RecruiterProject } from '@/hooks/recruiter/types';
import { useProjectAtsSync, useProjectAutomationStatus, useProjectSlaBreaches } from '@/hooks/recruiter-pro/useRecruiterProProjects';
import { getApiErrorMessage } from '@/lib/api';

const STATUS_TONE: Record<RecruiterProject['status'], 'neutral' | 'brand' | 'warning' | 'success'> = {
  active: 'brand',
  on_hold: 'warning',
  completed: 'success',
  archived: 'neutral',
};

/**
 * Domain 21.05 merged Recruiter Projects page. This is the first build for
 * this route (Domain 20's src/app/app/(workspace)/recruiter-projects/page.tsx
 * did not exist at build time — checked before writing this file), so the
 * standard-tier fields (name, status, target vs filled hires, target date)
 * that Domain 20 would have rendered are the always-visible base of this
 * page, and the Pro-only panels (automation status, SLA breaches, ATS sync)
 * are additive and gated behind seat.tier === 'pro'.
 */
function ProjectAtsBadge({ projectId, enabled }: { projectId: string; enabled: boolean }) {
  const { data } = useProjectAtsSync(projectId, enabled);
  if (!enabled || !data || data.status === 'not_connected') return null;
  const tone = data.status === 'synced' ? 'success' : data.status === 'error' ? 'danger' : 'warning';
  return (
    <Badge tone={tone} className="capitalize">
      <Link2 className="mr-1 h-2.5 w-2.5" /> {data.provider} {data.status}
    </Badge>
  );
}

function ProjectAutomationRow({ projectId, enabled }: { projectId: string; enabled: boolean }) {
  const { data } = useProjectAutomationStatus(projectId, enabled);
  if (!enabled || !data) return null;
  return (
    <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-500 dark:text-ink-400">
      <Bot className="h-3.5 w-3.5 text-purple-600" />
      {data.automation_enabled ? `${data.active_sequences} sequence(s) automating outreach` : 'Automation off for this project'}
    </p>
  );
}

function ProjectCard({ project, isPro }: { project: RecruiterProject; isPro: boolean }) {
  const fillPct = project.target_hires > 0 ? Math.min(100, Math.round((project.filled_hires / project.target_hires) * 100)) : 0;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink-900 dark:text-white">{project.name}</p>
          {project.client_or_role && <p className="mt-0.5 truncate text-xs text-ink-400 dark:text-ink-500">{project.client_or_role}</p>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge tone={STATUS_TONE[project.status]} className="capitalize">
            {project.status.replace('_', ' ')}
          </Badge>
          {isPro && <ProjectAtsBadge projectId={project.id} enabled={isPro} />}
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-ink-500 dark:text-ink-400">
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" /> {project.filled_hires} / {project.target_hires} filled
          </span>
          <span>{fillPct}%</span>
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
          <div className="h-full rounded-full bg-brand-600" style={{ width: `${fillPct}%` }} />
        </div>
      </div>

      {project.target_date && <p className="mt-3 text-xs text-ink-400 dark:text-ink-500">Target date {format(new Date(project.target_date), 'MMM d, yyyy')}</p>}

      {isPro && <ProjectAutomationRow projectId={project.id} enabled={isPro} />}
      {!isPro && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-300 dark:text-ink-600">
          <Sparkles className="h-3 w-3" /> Automation, SLA and ATS sync insights available on Recruiter Pro
        </p>
      )}
    </Card>
  );
}

function NewProjectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('');
  const [targetHires, setTargetHires] = useState('1');
  const create = useCreateRecruiterProject();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    create.mutate(
      { name: name.trim(), target_hires: Number(targetHires) || 1 },
      { onSuccess: () => { setName(''); setTargetHires('1'); onClose(); } }
    );
  }

  return (
    <Modal open={open} onClose={onClose} className="max-w-md" labelledBy="new-project-title">
      <ModalHeader title="New recruiting project" onClose={onClose} />
      <form onSubmit={submit} className="space-y-3 px-5 py-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-600 dark:text-ink-300">Project name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Senior Engineer — Acme Corp" data-autofocus />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-600 dark:text-ink-300">Target hires</label>
          <Input type="number" min={1} value={targetHires} onChange={(e) => setTargetHires(e.target.value)} />
        </div>
        {create.isError && <p className="text-xs text-red-600">{getApiErrorMessage(create.error)}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={create.isPending} disabled={!name.trim()}>
            Create project
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function RecruiterProjectsInner() {
  const { data: seat } = useRecruiterSeat();
  const isPro = seat?.tier === 'pro';
  const [status, setStatus] = useState<RecruiterProject['status'] | 'all'>('all');
  const [modalOpen, setModalOpen] = useState(false);

  const { data, isLoading, isError, error } = useRecruiterProjects(status === 'all' ? undefined : status);
  const { data: slaBreaches } = useProjectSlaBreaches(isPro);
  const projects = data?.data || [];

  const kpis = useMemo(() => {
    const totalTarget = projects.reduce((sum, p) => sum + p.target_hires, 0);
    const totalFilled = projects.reduce((sum, p) => sum + p.filled_hires, 0);
    const active = projects.filter((p) => p.status === 'active').length;
    return { totalTarget, totalFilled, active };
  }, [projects]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-4 py-5 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
            <FolderKanban className="h-5 w-5 text-brand-600" /> Recruiter Projects
          </h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Hiring projects, target vs filled hires — plus automation, SLA and ATS sync insight on Pro.</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>New project</Button>
      </div>

      {!isPro && <ProUpgradeBanner feature="Recruiter Projects automation & SLA tracking" />}

      <KpiGrid>
        <KpiCard label="Active projects" value={kpis.active} icon={FolderKanban} tone="brand" />
        <KpiCard label="Total target hires" value={kpis.totalTarget} />
        <KpiCard label="Total filled hires" value={kpis.totalFilled} tone="success" />
        {isPro && (
          <KpiCard
            label="SLA breaches"
            value={slaBreaches?.length ?? 0}
            icon={AlertTriangle}
            tone={(slaBreaches?.length ?? 0) > 0 ? 'danger' : 'success'}
          />
        )}
      </KpiGrid>

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as RecruiterProject['status'] | 'all')}
            aria-label="Filter by status"
            className="h-9 rounded-lg border border-ink-200 bg-white px-2.5 text-xs font-semibold text-ink-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="on_hold">On hold</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </Card>

      {isPro && slaBreaches && slaBreaches.length > 0 && (
        <Card className="border-red-200 dark:border-red-500/30">
          <CardHeader title="SLA breaches" />
          <div className="divide-y divide-ink-50 px-5 py-2 dark:divide-ink-800/60">
            {slaBreaches.map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-2 py-2">
                <div>
                  <p className="text-sm font-semibold text-ink-800 dark:text-ink-100">{b.candidate_name}</p>
                  <p className="text-xs text-ink-400 dark:text-ink-500">Stuck in {b.stage_name} since {format(new Date(b.breached_since), 'MMM d')}</p>
                </div>
                <Badge tone="danger">
                  <AlertTriangle className="mr-1 h-2.5 w-2.5" /> Breached
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      )}

      {isError && (
        <Card className="py-16 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Couldn&rsquo;t load projects</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(error)}</p>
        </Card>
      )}

      {!isLoading && !isError && projects.length === 0 && (
        <Card className="border-dashed py-16 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">No projects match this status</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">Create your first recruiting project to start tracking hires.</p>
        </Card>
      )}

      {!isLoading && !isError && projects.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} isPro={isPro} />
          ))}
        </div>
      )}

      <NewProjectModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}

export default function RecruiterProjectsPage() {
  return (
    <RecruiterSeatGate>
      <RecruiterProjectsInner />
    </RecruiterSeatGate>
  );
}
