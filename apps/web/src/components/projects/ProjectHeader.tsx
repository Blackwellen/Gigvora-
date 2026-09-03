'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { CalendarDays, User } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { ProjectStatusBadge } from './ProjectStatusBadge';
import { ProjectProgressRing } from './ProjectProgressRing';
import { ProjectTeamAvatars } from './ProjectTeamAvatars';
import { AskCopilotButton } from './AskCopilotButton';
import type { PmProject, PmProjectMember } from '@/hooks/projects/types';

function initialsFromName(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export function ProjectHeader({ project, members, actions }: { project: PmProject; members: PmProjectMember[]; actions?: React.ReactNode }) {
  const owner = members.find((m) => m.role === 'owner');

  return (
    <div className="space-y-3">
      <nav className="text-sm text-ink-400 dark:text-ink-500">
        <Link href="/app/projects-home" className="hover:underline">
          Projects
        </Link>{' '}
        / <span className="text-ink-600 dark:text-ink-300">{project.name}</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white">
            {initialsFromName(project.name)}
          </span>
          <div>
            <h1 className="text-xl font-bold text-ink-900 dark:text-white">{project.name}</h1>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-ink-500 dark:text-ink-400">
              <ProjectStatusBadge status={project.status} />
              {project.clientName && <span>· Client: {project.clientName}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AskCopilotButton projectId={project.id} />
          {actions}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-2xl border border-ink-100 bg-white p-4 shadow-surface dark:border-ink-800 dark:bg-ink-900 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Owner">
          {owner ? (
            <span className="flex items-center gap-2">
              <Avatar name={`${owner.firstName || ''} ${owner.lastName || ''}`.trim() || 'Owner'} src={owner.avatarUrl} size="xs" />
              <span className="truncate text-sm font-semibold text-ink-900 dark:text-white">{`${owner.firstName || ''} ${owner.lastName || ''}`.trim() || '—'}</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-sm text-ink-400"><User className="h-3.5 w-3.5" /> Unassigned</span>
          )}
        </Stat>
        <Stat label="Timeline">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-ink-900 dark:text-white">
            <CalendarDays className="h-3.5 w-3.5 text-ink-400" />
            {project.startDate ? format(new Date(project.startDate), 'MMM d') : '—'} – {project.targetEndDate ? format(new Date(project.targetEndDate), 'MMM d, yyyy') : '—'}
          </span>
        </Stat>
        <Stat label="Team">
          <ProjectTeamAvatars members={members} />
        </Stat>
        <Stat label="Tasks">
          <span className="text-sm font-semibold text-ink-900 dark:text-white">
            {project.taskDoneCount ?? 0} / {project.taskCount ?? 0} done
            {Boolean(project.taskOverdueCount) && <span className="ml-1.5 text-red-600 dark:text-red-400">({project.taskOverdueCount} overdue)</span>}
          </span>
        </Stat>
        <Stat label="Progress">
          <ProjectProgressRing percent={project.progressPct} size={36} />
        </Stat>
      </div>
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-400 dark:text-ink-500">{label}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}
