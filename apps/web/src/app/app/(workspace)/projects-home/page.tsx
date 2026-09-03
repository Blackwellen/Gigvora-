'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { FolderKanban, Loader2, Plus, Search } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Tabs } from '@/components/ui/Tabs';
import { ProjectStatusBadge } from '@/components/projects/ProjectStatusBadge';
import { ProjectProgressRing } from '@/components/projects/ProjectProgressRing';
import { useProjects } from '@/hooks/projects/useProjects';
import { getApiErrorMessage } from '@/lib/api';

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'on_hold', label: 'On hold' },
  { key: 'completed', label: 'Completed' },
  { key: 'archived', label: 'Archived' },
] as const;

export default function ProjectsHomePage() {
  const [status, setStatus] = useState<(typeof STATUS_TABS)[number]['key']>('all');
  const [search, setSearch] = useState('');
  const { data, isLoading, isError, error } = useProjects({ status: status === 'all' ? undefined : status, search: search || undefined });

  const projects = data?.data || [];

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-4 py-5 lg:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
            <FolderKanban className="h-5 w-5 text-brand-600" /> Projects Home
          </h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Track all your projects, timelines, and team progress in one place.</p>
        </div>
        <Link href="/app/create-project/new">
          <Button>
            <Plus className="h-4 w-4" /> New project
          </Button>
        </Link>
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search projects by name or client" className="pl-9" />
          </div>
          <Tabs tabs={STATUS_TABS.map((t) => ({ ...t }))} value={status} onChange={(k) => setStatus(k as typeof status)} />
        </div>
      </Card>

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
        <Card className="py-16 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">{search ? 'No projects match your search' : 'No projects yet'}</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">
            {search ? 'Try a different name or client.' : 'Create your first project to start tracking tasks, milestones, and delivery.'}
          </p>
          {!search && (
            <Link href="/app/create-project/new" className="mt-4 inline-block">
              <Button size="sm">
                <Plus className="h-4 w-4" /> New project
              </Button>
            </Link>
          )}
        </Card>
      )}

      {!isLoading && !isError && projects.length > 0 && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400 dark:border-ink-800 dark:text-ink-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Project</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Progress</th>
                  <th className="px-4 py-3 font-medium">Due date</th>
                  <th className="px-4 py-3 font-medium">Tasks</th>
                  <th className="px-4 py-3 font-medium">Members</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id} className="border-b border-ink-50 last:border-0 hover:bg-ink-50 dark:border-ink-800/60 dark:hover:bg-ink-800/60">
                    <td className="px-4 py-3">
                      <Link href={`/app/project-detail/${project.id}`} className="block">
                        <span className="font-semibold text-ink-900 hover:text-brand-700 dark:text-white">{project.name}</span>
                        {project.clientName && <span className="block text-xs text-ink-400 dark:text-ink-500">{project.clientName}</span>}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <ProjectStatusBadge status={project.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ProjectProgressRing percent={project.progressPct} size={28} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-600 dark:text-ink-300">{project.targetEndDate ? format(new Date(project.targetEndDate), 'MMM d, yyyy') : '—'}</td>
                    <td className="px-4 py-3 text-ink-600 dark:text-ink-300">
                      {project.taskDoneCount ?? 0}/{project.taskCount ?? 0}
                    </td>
                    <td className="px-4 py-3 text-ink-600 dark:text-ink-300">{project.memberCount ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
