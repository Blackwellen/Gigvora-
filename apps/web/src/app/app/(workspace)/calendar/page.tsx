'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { eachDayOfInterval, endOfMonth, format, isSameDay, isSameMonth, startOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProjectShell } from '@/components/projects/ProjectShell';
import { useProjectTasks } from '@/hooks/projects/useProjectTasks';
import { useProjectMilestones } from '@/hooks/projects/useProjectMilestones';

// Domain 18 Phase B — Calendar (18.08): month view built from real task due
// dates and milestone target dates. No dedicated calendar-events table for
// Domain 18 yet, so meetings/reviews aren't shown here — only what this
// domain actually owns.
function CalendarInner() {
  const projectId = useSearchParams().get('projectId') || undefined;
  const { data: tasks, isLoading } = useProjectTasks(projectId);
  const { data: milestones } = useProjectMilestones(projectId);

  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  function itemsForDay(day: Date) {
    const dayTasks = (tasks || []).filter((t) => t.dueDate && isSameDay(new Date(t.dueDate), day));
    const dayMilestones = (milestones || []).filter((m) => m.targetDate && isSameDay(new Date(m.targetDate), day));
    return { dayTasks, dayMilestones };
  }

  return (
    <ProjectShell projectId={projectId} activeTab="calendar">
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-7 border-b border-ink-100 text-center text-xs font-semibold uppercase tracking-wide text-ink-400 dark:border-ink-800 dark:text-ink-500">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
              <div key={d} className="py-2">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const { dayTasks, dayMilestones } = itemsForDay(day);
              const inMonth = isSameMonth(day, today);
              const isToday = isSameDay(day, today);
              return (
                <div key={day.toISOString()} className={`min-h-[90px] border-b border-r border-ink-50 p-1.5 dark:border-ink-800/60 ${inMonth ? '' : 'bg-ink-50/40 dark:bg-ink-900/40'}`}>
                  <span className={`text-xs font-semibold ${isToday ? 'flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white' : inMonth ? 'text-ink-700 dark:text-ink-300' : 'text-ink-300 dark:text-ink-700'}`}>
                    {format(day, 'd')}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {dayMilestones.map((m) => (
                      <div key={m.id} className="truncate rounded bg-violet-50 px-1 py-0.5 text-[10px] font-semibold text-violet-700 dark:bg-violet-500/10 dark:text-violet-400">
                        ◆ {m.name}
                      </div>
                    ))}
                    {dayTasks.slice(0, 2).map((t) => (
                      <div key={t.id} className="truncate rounded bg-brand-50 px-1 py-0.5 text-[10px] font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
                        {t.title}
                      </div>
                    ))}
                    {dayTasks.length > 2 && <div className="px-1 text-[10px] text-ink-400">+{dayTasks.length - 2} more</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
      <div className="mt-3 flex items-center gap-3 text-xs text-ink-500 dark:text-ink-400">
        <Badge tone="brand">Task due</Badge>
        <span>Task due date</span>
        <span className="mx-1">·</span>
        <span className="text-violet-600 dark:text-violet-400">◆ Milestone target date</span>
      </div>
    </ProjectShell>
  );
}

export default function CalendarPage() {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-ink-300" /></div>}>
      <CalendarInner />
    </Suspense>
  );
}
