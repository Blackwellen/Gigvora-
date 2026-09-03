'use client';

import { format, isPast, isToday } from 'date-fns';
import Link from 'next/link';
import { AlertTriangle, CheckSquare, ClipboardList, Flag, Loader2 } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { TaskPriorityBadge, TaskStatusBadge } from '@/components/projects/ProjectStatusBadge';
import { useProject } from '@/hooks/projects/useProject';
import { useProjectTasks } from '@/hooks/projects/useProjectTasks';

/**
 * Shared "operational summary" content used by both 18.02 Project Detail
 * (the canonical entry hub) and 18.04 Project Overview — the reference
 * designs render effectively the same panel for both, so this component is
 * the single source of truth rather than duplicating the layout twice.
 */
export function ProjectOverviewView({ projectId }: { projectId: string }) {
  const { data: project } = useProject(projectId);
  const { data: tasks, isLoading } = useProjectTasks(projectId);

  if (isLoading || !project) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  const openTasks = (tasks || []).filter((t) => t.status !== 'done');
  const overdueTasks = openTasks.filter((t) => t.dueDate && isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate)));
  const upcomingTasks = [...openTasks]
    .filter((t) => t.dueDate)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 5);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Card className="p-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-ink-900 dark:text-white">
            <ClipboardList className="h-4 w-4 text-brand-600" /> Project objective
          </h3>
          <p className="text-sm text-ink-600 dark:text-ink-300">{project.description || 'No description has been added yet.'}</p>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader
            title="Upcoming tasks"
            action={
              <Link href={`/app/project-tasks?projectId=${projectId}`} className="text-xs font-semibold text-brand-600 hover:text-brand-700">
                View all tasks
              </Link>
            }
          />
          {upcomingTasks.length === 0 ? (
            <p className="px-5 py-6 text-sm text-ink-400 dark:text-ink-500">No upcoming tasks with a due date.</p>
          ) : (
            <ul className="mt-2">
              {upcomingTasks.map((task) => (
                <li key={task.id} className="flex items-center justify-between gap-3 border-t border-ink-100 px-5 py-3 dark:border-ink-800">
                  <span className="min-w-0 truncate text-sm font-medium text-ink-900 dark:text-white">{task.title}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    <TaskPriorityBadge priority={task.priority} />
                    <span className="text-xs text-ink-400 dark:text-ink-500">{task.dueDate ? format(new Date(task.dueDate), 'MMM d') : '—'}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="space-y-4">
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-bold text-ink-900 dark:text-white">Task summary</h3>
          <div className="grid grid-cols-3 gap-2 text-center">
            <SummaryStat label="Done" value={project.taskDoneCount ?? 0} />
            <SummaryStat label="Open" value={(project.taskCount ?? 0) - (project.taskDoneCount ?? 0)} />
            <SummaryStat label="Overdue" value={project.taskOverdueCount ?? 0} tone="danger" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold text-ink-900 dark:text-white">
              <Flag className="h-4 w-4 text-brand-600" /> Milestones
            </h3>
            <Link href={`/app/milestones?projectId=${projectId}`} className="text-xs font-semibold text-brand-600 hover:text-brand-700">
              View all
            </Link>
          </div>
          <p className="text-sm text-ink-500 dark:text-ink-400">{project.milestoneCount ?? 0} milestone(s) tracked for this project.</p>
        </Card>

        {overdueTasks.length > 0 && (
          <Card className="border-red-200 bg-red-50/60 p-4 dark:border-red-500/30 dark:bg-red-500/10">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-red-700 dark:text-red-400">
              <AlertTriangle className="h-4 w-4" /> Overdue tasks
            </h3>
            <ul className="space-y-1.5">
              {overdueTasks.slice(0, 4).map((task) => (
                <li key={task.id} className="flex items-center justify-between text-sm">
                  <span className="truncate text-red-800 dark:text-red-300">{task.title}</span>
                  <TaskStatusBadge status={task.status} />
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card className="p-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-ink-900 dark:text-white">
            <CheckSquare className="h-4 w-4 text-brand-600" /> Jump to
          </h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Link href={`/app/budget?projectId=${projectId}`} className="rounded-lg border border-ink-100 px-2.5 py-1.5 text-center font-semibold text-ink-700 hover:border-brand-300 hover:text-brand-700 dark:border-ink-800 dark:text-ink-300">
              Budget
            </Link>
            <Link href={`/app/project-payments?projectId=${projectId}`} className="rounded-lg border border-ink-100 px-2.5 py-1.5 text-center font-semibold text-ink-700 hover:border-brand-300 hover:text-brand-700 dark:border-ink-800 dark:text-ink-300">
              Payments
            </Link>
            <Link href={`/app/files?projectId=${projectId}`} className="rounded-lg border border-ink-100 px-2.5 py-1.5 text-center font-semibold text-ink-700 hover:border-brand-300 hover:text-brand-700 dark:border-ink-800 dark:text-ink-300">
              Files
            </Link>
            <Link href={`/app/project-analytics?projectId=${projectId}`} className="rounded-lg border border-ink-100 px-2.5 py-1.5 text-center font-semibold text-ink-700 hover:border-brand-300 hover:text-brand-700 dark:border-ink-800 dark:text-ink-300">
              Analytics &amp; AI risk
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

function SummaryStat({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'danger' }) {
  return (
    <div>
      <p className={`text-lg font-bold ${tone === 'danger' ? 'text-red-600 dark:text-red-400' : 'text-ink-900 dark:text-white'}`}>{value}</p>
      <p className="text-xs text-ink-500 dark:text-ink-400">{label}</p>
    </div>
  );
}
