'use client';

import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { CheckSquare, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { useTasks, useCompleteTask, type TaskItem, type TaskPriority } from '@/hooks/useTasks';
import { WidgetDropdown, WidgetLoadingSkeleton, WidgetEmptyState, WidgetErrorState } from './WidgetDropdown';

const PRIORITY_TONE: Record<TaskPriority, 'neutral' | 'brand' | 'warning' | 'danger'> = {
  low: 'neutral',
  medium: 'brand',
  high: 'warning',
  urgent: 'danger',
};

function formatDue(dueDate: string | null) {
  if (!dueDate) return null;
  const date = new Date(dueDate);
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'MMM d');
}

export function TaskListWidget() {
  const { data: tasks, isLoading, isError } = useTasks(8);
  const completeTask = useCompleteTask();

  const items = tasks || [];

  return (
    <WidgetDropdown label="Tasks" icon={CheckSquare} count={items.length} title="Upcoming tasks" viewAllHref="/app/tasks" dataTourAnchor="tasks">
      {isLoading && <WidgetLoadingSkeleton />}
      {isError && <WidgetErrorState message="Tasks aren't available right now." />}
      {!isLoading && !isError && items.length === 0 && (
        <WidgetEmptyState icon={CheckSquare} message="No upcoming tasks" hint="You're clear for now." />
      )}
      {!isLoading && items.length > 0 && (
        <ul className="space-y-0.5">
          {items.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onComplete={() => completeTask.mutate(task.id)}
              isPending={completeTask.isPending && completeTask.variables === task.id}
            />
          ))}
        </ul>
      )}
    </WidgetDropdown>
  );
}

function TaskRow({ task, onComplete, isPending }: { task: TaskItem; onComplete: () => void; isPending: boolean }) {
  const due = formatDue(task.dueDate);
  const overdue = task.dueDate ? isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate)) : false;

  return (
    <li className="flex items-start gap-2.5 rounded-lg px-2.5 py-2 hover:bg-ink-50 dark:hover:bg-ink-800">
      <button
        type="button"
        onClick={onComplete}
        disabled={isPending}
        aria-label={`Mark "${task.title}" complete`}
        className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border border-ink-300 hover:border-brand-500 hover:bg-brand-50 disabled:opacity-50 dark:border-ink-600 dark:hover:bg-brand-500/10"
      >
        {isPending && <Loader2 className="h-3 w-3 animate-spin text-brand-500" />}
      </button>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink-900 dark:text-white">{task.title}</span>
        <span className="mt-1 flex flex-wrap items-center gap-1.5">
          {due && (
            <span className={`text-xs font-medium ${overdue ? 'text-red-600 dark:text-red-400' : 'text-ink-400 dark:text-ink-500'}`}>
              {overdue ? `Overdue · ${due}` : due}
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
