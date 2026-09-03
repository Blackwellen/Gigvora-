'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { differenceInCalendarDays, format, min as minDate, max as maxDate } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { ProjectShell } from '@/components/projects/ProjectShell';
import { useProjectTasks } from '@/hooks/projects/useProjectTasks';
import { useProjectMilestones } from '@/hooks/projects/useProjectMilestones';

// Domain 18 Phase B — Timeline / Gantt (18.07). A read-only visual timeline
// derived from real task start/due dates and milestone target dates — not
// an editable drag-to-reschedule Gantt (that needs its own interaction
// design pass) but every bar/diamond on it is real project data.
function TimelineInner() {
  const projectId = useSearchParams().get('projectId') || undefined;
  const { data: tasks, isLoading } = useProjectTasks(projectId);
  const { data: milestones } = useProjectMilestones(projectId);

  const datedTasks = (tasks || []).filter((t) => t.dueDate);
  const allDates = [
    ...datedTasks.flatMap((t) => [t.startDate ? new Date(t.startDate) : new Date(t.dueDate!), new Date(t.dueDate!)]),
    ...(milestones || []).filter((m) => m.targetDate).map((m) => new Date(m.targetDate!)),
  ];

  const rangeStart = allDates.length ? minDate(allDates) : new Date();
  const rangeEnd = allDates.length ? maxDate(allDates) : new Date();
  const totalDays = Math.max(1, differenceInCalendarDays(rangeEnd, rangeStart)) + 4;

  function barStyle(start: Date, end: Date) {
    const left = (differenceInCalendarDays(start, rangeStart) / totalDays) * 100;
    const width = Math.max(2, (differenceInCalendarDays(end, start) + 1) / totalDays * 100);
    return { left: `${left}%`, width: `${width}%` };
  }

  return (
    <ProjectShell projectId={projectId} activeTab="timeline">
      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      )}

      {!isLoading && datedTasks.length === 0 && (milestones || []).length === 0 && (
        <Card className="py-14 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Nothing to show yet</p>
          <p className="mt-1 text-sm text-ink-400 dark:text-ink-500">Add due dates to tasks or target dates to milestones to see a timeline.</p>
        </Card>
      )}

      {!isLoading && (datedTasks.length > 0 || (milestones || []).length > 0) && (
        <Card className="overflow-x-auto p-4">
          <div className="mb-2 flex justify-between text-xs font-medium text-ink-400 dark:text-ink-500">
            <span>{format(rangeStart, 'MMM d, yyyy')}</span>
            <span>{format(rangeEnd, 'MMM d, yyyy')}</span>
          </div>
          <div className="min-w-[640px] space-y-2">
            {datedTasks.map((task) => {
              const start = task.startDate ? new Date(task.startDate) : new Date(task.dueDate!);
              const end = new Date(task.dueDate!);
              return (
                <div key={task.id} className="flex items-center gap-3">
                  <span className="w-40 shrink-0 truncate text-xs font-medium text-ink-700 dark:text-ink-300">{task.title}</span>
                  <div className="relative h-5 flex-1 rounded bg-ink-50 dark:bg-ink-800">
                    <div
                      className={`absolute top-0 h-5 rounded ${task.status === 'done' ? 'bg-emerald-500' : task.status === 'blocked' ? 'bg-red-400' : 'bg-brand-500'}`}
                      style={barStyle(start, end)}
                      title={`${format(start, 'MMM d')} – ${format(end, 'MMM d')}`}
                    />
                  </div>
                </div>
              );
            })}

            {(milestones || [])
              .filter((m) => m.targetDate)
              .map((m) => {
                const date = new Date(m.targetDate!);
                const left = (differenceInCalendarDays(date, rangeStart) / totalDays) * 100;
                return (
                  <div key={m.id} className="flex items-center gap-3">
                    <span className="w-40 shrink-0 truncate text-xs font-semibold text-ink-900 dark:text-white">◆ {m.name}</span>
                    <div className="relative h-5 flex-1">
                      <div className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rotate-45 bg-violet-500" style={{ left: `calc(${left}% - 5px)` }} title={format(date, 'MMM d, yyyy')} />
                    </div>
                  </div>
                );
              })}
          </div>
        </Card>
      )}
    </ProjectShell>
  );
}

export default function TimelineGanttPage() {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-ink-300" /></div>}>
      <TimelineInner />
    </Suspense>
  );
}
