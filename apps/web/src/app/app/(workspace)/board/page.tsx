'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { format, isPast, isToday } from 'date-fns';
import { Loader2, Radio } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { ProjectShell } from '@/components/projects/ProjectShell';
import { TaskPriorityBadge } from '@/components/projects/ProjectStatusBadge';
import { useProjectBoard, useMoveTask } from '@/hooks/projects/useProjectBoard';
import { getApiErrorMessage } from '@/lib/api';
import type { PmBoardColumn, PmTask } from '@/hooks/projects/types';

const COLUMNS: Array<{ key: PmBoardColumn; label: string }> = [
  { key: 'backlog', label: 'Backlog' },
  { key: 'todo', label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'in_review', label: 'In Review' },
  { key: 'done', label: 'Done' },
];

function BoardInner() {
  const projectId = useSearchParams().get('projectId') || undefined;
  const { data: tasks, isLoading, isError, error } = useProjectBoard(projectId);
  const moveTask = useMoveTask(projectId);
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<PmBoardColumn | null>(null);

  function handleDrop(column: PmBoardColumn, index: number) {
    if (!dragTaskId || !tasks) return;
    const task = tasks.find((t) => t.id === dragTaskId);
    if (!task) return;
    setDragOverColumn(null);
    setDragTaskId(null);
    if (task.boardColumn === column && task.boardOrder === index) return;
    moveTask.mutate({ taskId: task.id, boardColumn: column, boardOrder: index, version: task.version });
  }

  return (
    <ProjectShell
      projectId={projectId}
      activeTab="board"
      actions={
        <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
          <Radio className="h-3 w-3" /> Live sync
        </span>
      }
    >
      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      )}

      {isError && (
        <Card className="py-14 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Couldn&rsquo;t load the board</p>
          <p className="mt-1 text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(error)}</p>
        </Card>
      )}

      {!isLoading && !isError && tasks && (
        <div className="grid grid-cols-1 gap-3 overflow-x-auto pb-2 sm:grid-cols-2 lg:grid-flow-col lg:auto-cols-[260px]">
          {COLUMNS.map((col) => {
            const colTasks = tasks.filter((t) => t.boardColumn === col.key).sort((a, b) => a.boardOrder - b.boardOrder);
            return (
              <div
                key={col.key}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverColumn(col.key);
                }}
                onDragLeave={() => setDragOverColumn((c) => (c === col.key ? null : c))}
                onDrop={() => handleDrop(col.key, colTasks.length)}
                className={`min-w-[240px] rounded-2xl border p-2.5 ${
                  dragOverColumn === col.key ? 'border-brand-300 bg-brand-50/50 dark:border-brand-500/40 dark:bg-brand-500/5' : 'border-ink-100 bg-ink-50/50 dark:border-ink-800 dark:bg-ink-900/40'
                }`}
              >
                <div className="mb-2 flex items-center justify-between px-1">
                  <h3 className="text-sm font-bold text-ink-900 dark:text-white">{col.label}</h3>
                  <span className="rounded-full bg-ink-100 px-1.5 text-xs font-semibold text-ink-500 dark:bg-ink-800 dark:text-ink-400">{colTasks.length}</span>
                </div>
                <div className="space-y-2">
                  {colTasks.map((task, index) => (
                    <BoardCard
                      key={task.id}
                      task={task}
                      isDragging={dragTaskId === task.id}
                      onDragStart={() => setDragTaskId(task.id)}
                      onDragOverCard={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDragOverColumn(col.key);
                      }}
                      onDropOnCard={(e) => {
                        e.stopPropagation();
                        handleDrop(col.key, index);
                      }}
                    />
                  ))}
                  {colTasks.length === 0 && <p className="px-2 py-6 text-center text-xs text-ink-400 dark:text-ink-500">Drop a task here</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ProjectShell>
  );
}

function BoardCard({
  task,
  isDragging,
  onDragStart,
  onDragOverCard,
  onDropOnCard,
}: {
  task: PmTask;
  isDragging: boolean;
  onDragStart: () => void;
  onDragOverCard: (e: React.DragEvent) => void;
  onDropOnCard: (e: React.DragEvent) => void;
}) {
  const overdue = task.dueDate && task.status !== 'done' && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate));

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOverCard}
      onDrop={onDropOnCard}
      role="button"
      tabIndex={0}
      aria-roledescription="Draggable task card"
      className={`cursor-grab rounded-xl border border-ink-100 bg-white p-3 shadow-sm active:cursor-grabbing dark:border-ink-800 dark:bg-ink-900 ${isDragging ? 'opacity-40' : ''}`}
    >
      <p className="text-sm font-semibold text-ink-900 dark:text-white">{task.title}</p>
      <div className="mt-2 flex items-center justify-between">
        <TaskPriorityBadge priority={task.priority} />
        {task.dueDate && (
          <span className={`text-xs font-medium ${overdue ? 'text-red-600 dark:text-red-400' : 'text-ink-400 dark:text-ink-500'}`}>{format(new Date(task.dueDate), 'MMM d')}</span>
        )}
      </div>
    </div>
  );
}

export default function BoardPage() {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-ink-300" /></div>}>
      <BoardInner />
    </Suspense>
  );
}
