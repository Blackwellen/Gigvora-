'use client';

import { useState } from 'react';
import { format, isPast, isToday } from 'date-fns';
import { CheckSquare, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { useTasks, useCompleteTask, type TaskItem, type TaskPriority } from '@/hooks/useTasks';

const PRIORITY_TONE: Record<TaskPriority, 'neutral' | 'brand' | 'warning' | 'danger'> = {
  low: 'neutral',
  medium: 'brand',
  high: 'warning',
  urgent: 'danger',
};

const CATEGORIES = [
  { key: 'open', label: 'Open' },
  { key: 'overdue', label: 'Overdue' },
] as const;

export default function TasksPage() {
  const { data: tasks, isLoading, isError } = useTasks(50);
  const completeTask = useCompleteTask();
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]['key']>('open');

  const items = tasks || [];
  const overdueCount = items.filter((t) => t.dueDate && isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate))).length;
  const filtered = category === 'overdue' ? items.filter((t) => t.dueDate && isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate))) : items;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:px-0">
      <h1 className="mb-4 flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
        <CheckSquare className="h-5 w-5" /> Tasks
      </h1>

      <div className="rounded-2xl border border-ink-100 bg-white shadow-surface dark:border-ink-800 dark:bg-ink-900">
        <Tabs
          tabs={CATEGORIES.map((c) => ({ ...c, count: c.key === 'overdue' ? overdueCount : undefined }))}
          value={category}
          onChange={(k) => setCategory(k as typeof category)}
          className="px-2"
        />

        {isLoading && (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-ink-300" />
          </div>
        )}

        {isError && (
          <div className="py-14 text-center">
            <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Tasks aren&rsquo;t available right now</p>
            <p className="mt-1 text-sm text-ink-400 dark:text-ink-500">This feature is being finalized on the backend — check back shortly.</p>
          </div>
        )}

        {!isLoading && !isError && filtered.length === 0 && (
          <div className="py-14 text-center">
            <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Nothing here</p>
            <p className="mt-1 text-sm text-ink-400 dark:text-ink-500">
              {category === 'overdue' ? 'No overdue tasks — nice work.' : 'No open tasks right now.'}
            </p>
          </div>
        )}

        <ul>
          {filtered.map((task) => (
            <TaskRow key={task.id} task={task} onComplete={() => completeTask.mutate(task.id)} isPending={completeTask.isPending && completeTask.variables === task.id} />
          ))}
        </ul>
      </div>
    </div>
  );
}

function TaskRow({ task, onComplete, isPending }: { task: TaskItem; onComplete: () => void; isPending: boolean }) {
  const overdue = task.dueDate ? isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate)) : false;

  return (
    <li className="flex items-start gap-3 border-t border-ink-100 px-4 py-3 hover:bg-ink-50 dark:border-ink-800 dark:hover:bg-ink-800">
      <button
        type="button"
        onClick={onComplete}
        disabled={isPending}
        aria-label={`Mark "${task.title}" complete`}
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-ink-300 hover:border-brand-500 hover:bg-brand-50 disabled:opacity-50 dark:border-ink-600 dark:hover:bg-brand-500/10"
      >
        {isPending && <Loader2 className="h-3 w-3 animate-spin text-brand-500" />}
      </button>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-ink-900 dark:text-white">{task.title}</span>
        <span className="mt-1 flex flex-wrap items-center gap-1.5">
          {task.dueDate && (
            <span className={`text-xs font-medium ${overdue ? 'text-red-600 dark:text-red-400' : 'text-ink-400 dark:text-ink-500'}`}>
              {overdue ? 'Overdue · ' : 'Due '}
              {format(new Date(task.dueDate), 'MMM d, yyyy')}
            </span>
          )}
          <Badge tone={PRIORITY_TONE[task.priority]} className="capitalize">
            {task.priority}
          </Badge>
        </span>
      </span>
    </li>
  );
}
