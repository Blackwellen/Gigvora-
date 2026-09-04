'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { format, isPast, isToday } from 'date-fns';
import { Loader2, Plus, Search, Sparkles } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal, ModalHeader } from '@/components/ui/Modal';
import { TagPicker } from '@/components/ui/TagPicker';
import { ProjectShell } from '@/components/projects/ProjectShell';
import { TaskPriorityBadge, TaskStatusBadge } from '@/components/projects/ProjectStatusBadge';
import { useProjectTasks, useCreateTask, useUpdateTask, sortBySuggestedOrderClient } from '@/hooks/projects/useProjectTasks';
import type { PmTask, PmTaskPriority, PmTaskStatus } from '@/hooks/projects/types';
import { getApiErrorMessage } from '@/lib/api';

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'todo', label: 'To do' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'in_review', label: 'In review' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'done', label: 'Done' },
];

function TasksInner() {
  const projectId = useSearchParams().get('projectId') || undefined;
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [suggested, setSuggested] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: tasks, isLoading, isError, error } = useProjectTasks(projectId, { status: status || undefined, search: search || undefined });

  const rows = suggested ? sortBySuggestedOrderClient(tasks || []) : tasks || [];
  const doneCount = (tasks || []).filter((t) => t.status === 'done').length;
  const inProgressCount = (tasks || []).filter((t) => t.status === 'in_progress').length;
  const inReviewCount = (tasks || []).filter((t) => t.status === 'in_review').length;
  const overdueCount = (tasks || []).filter((t) => t.dueDate && t.status !== 'done' && isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate))).length;

  return (
    <ProjectShell
      projectId={projectId}
      activeTab="tasks"
      tabCounts={{ tasks: tasks?.length }}
      actions={
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> New task
        </Button>
      }
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-3">
          <Card className="p-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[220px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks" className="pl-9" />
              </div>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="h-10 rounded-control border border-ink-200 bg-white px-3 text-sm text-ink-700 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setSuggested((s) => !s)}
                aria-pressed={suggested}
                className={`flex items-center gap-1.5 rounded-control border px-3 py-2 text-sm font-semibold transition-colors ${
                  suggested ? 'border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-400' : 'border-ink-200 text-ink-600 hover:bg-ink-50 dark:border-ink-700 dark:text-ink-300'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" /> Suggested order
              </button>
            </div>
          </Card>

          {isLoading && (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
            </div>
          )}

          {isError && (
            <Card className="py-14 text-center">
              <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Couldn&rsquo;t load tasks</p>
              <p className="mt-1 text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(error)}</p>
            </Card>
          )}

          {!isLoading && !isError && rows.length === 0 && (
            <Card className="py-14 text-center">
              <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">No tasks yet</p>
              <p className="mt-1 text-sm text-ink-400 dark:text-ink-500">Create the first task for this project.</p>
            </Card>
          )}

          {!isLoading && !isError && rows.length > 0 && (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400 dark:border-ink-800 dark:text-ink-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Task</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Priority</th>
                      <th className="px-4 py-3 font-medium">Due date</th>
                      <th className="px-4 py-3 font-medium">Estimate</th>
                      <th className="px-4 py-3 font-medium">Tags</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((task) => (
                      <TaskRow key={task.id} task={task} projectId={projectId!} />
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-3">
          <Card className="p-4">
            <h3 className="mb-3 text-sm font-bold text-ink-900 dark:text-white">Task summary</h3>
            <ul className="space-y-2 text-sm">
              <SummaryRow label="Done" value={doneCount} tone="success" />
              <SummaryRow label="In progress" value={inProgressCount} tone="brand" />
              <SummaryRow label="In review" value={inReviewCount} tone="warning" />
              <SummaryRow label="Overdue" value={overdueCount} tone="danger" />
            </ul>
          </Card>
          <Card className="p-4 text-sm text-ink-400 dark:text-ink-500">
            "Suggested order" sorts by due date then priority — a rule-based heuristic, not a machine-learned prediction. Model-backed prioritisation lands in a later phase.
          </Card>
        </div>
      </div>

      {projectId && <CreateTaskModal projectId={projectId} open={createOpen} onClose={() => setCreateOpen(false)} />}
    </ProjectShell>
  );
}

function TaskRow({ task, projectId }: { task: PmTask; projectId: string }) {
  const updateTask = useUpdateTask(projectId);
  const overdue = task.dueDate && task.status !== 'done' && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate));

  return (
    <tr className="border-b border-ink-50 last:border-0 hover:bg-ink-50 dark:border-ink-800/60 dark:hover:bg-ink-800/60">
      <td className="px-4 py-3 font-medium text-ink-900 dark:text-white">{task.title}</td>
      <td className="px-4 py-3">
        <select
          value={task.status}
          onChange={(e) => updateTask.mutate({ taskId: task.id, patch: { status: e.target.value as PmTaskStatus } })}
          className="rounded-lg border border-ink-200 bg-white px-2 py-1 text-xs font-semibold text-ink-700 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200"
        >
          {STATUS_OPTIONS.filter((o) => o.value).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3">
        <TaskPriorityBadge priority={task.priority} />
      </td>
      <td className={`px-4 py-3 ${overdue ? 'font-semibold text-red-600 dark:text-red-400' : 'text-ink-600 dark:text-ink-300'}`}>
        {task.dueDate ? format(new Date(task.dueDate), 'MMM d, yyyy') : '—'}
      </td>
      <td className="px-4 py-3 text-ink-600 dark:text-ink-300">{task.estimateHours ? `${task.estimateHours}h` : '—'}</td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {task.labels.length === 0 && <span className="text-ink-400 dark:text-ink-500">—</span>}
          {task.labels.map((label) => (
            <span key={label} className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-medium text-ink-600 dark:bg-ink-800 dark:text-ink-300">
              {label}
            </span>
          ))}
        </div>
      </td>
    </tr>
  );
}

function SummaryRow({ label, value, tone }: { label: string; value: number; tone: 'success' | 'brand' | 'warning' | 'danger' }) {
  const dotTone: Record<typeof tone, string> = {
    success: 'bg-emerald-500',
    brand: 'bg-brand-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
  };
  return (
    <li className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-ink-600 dark:text-ink-300">
        <span className={`h-2 w-2 rounded-full ${dotTone[tone]}`} /> {label}
      </span>
      <span className="font-semibold text-ink-900 dark:text-white">{value}</span>
    </li>
  );
}

function CreateTaskModal({ projectId, open, onClose }: { projectId: string; open: boolean; onClose: () => void }) {
  const createTask = useCreateTask(projectId);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<PmTaskPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [labels, setLabels] = useState<string[]>([]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await createTask.mutateAsync({ title, priority, dueDate: dueDate || undefined, labels: labels.length ? labels : undefined });
    setTitle('');
    setDueDate('');
    setPriority('medium');
    setLabels([]);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy="create-task-title" className="max-w-md">
      <ModalHeader title="New task" onClose={onClose} />
      <form onSubmit={handleSubmit} className="space-y-3 p-5">
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Title</label>
          <Input data-autofocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Design homepage hero section" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as PmTaskPriority)}
              className="h-10 w-full rounded-control border border-ink-200 bg-white px-3 text-sm dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Due date</label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Tags</label>
          <TagPicker value={labels} onChange={setLabels} placeholder="Search or add a tag..." />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={createTask.isPending} disabled={!title.trim()}>
            Create task
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function ProjectTasksPage() {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-ink-300" /></div>}>
      <TasksInner />
    </Suspense>
  );
}
