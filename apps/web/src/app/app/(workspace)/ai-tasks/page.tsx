'use client';

import { useMemo, useState } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import { Sparkles, FileText, Loader2, CheckCircle2, AlertTriangle, Database, X } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { useAiTasks, useCreateBulkSummaryTask, useCancelAiTask, type AiTask, type AiTaskStatus } from '@/hooks/useAiTasks';
import { CopilotNavStrip } from '@/components/copilot/CopilotNavStrip';

const STATUS_TONE: Record<AiTaskStatus, 'brand' | 'success' | 'danger' | 'neutral'> = {
  queued: 'neutral',
  running: 'brand',
  completed: 'success',
  failed: 'danger',
  cancelled: 'neutral',
};

function taskTypeLabel(taskType: string) {
  if (taskType === 'bulk_conversation_summary') return 'Bulk conversation summary';
  return taskType;
}

export default function AiTasksPage() {
  const { data, isLoading } = useAiTasks();
  const createTask = useCreateBulkSummaryTask();
  const cancelTask = useCancelAiTask();
  const [statusFilter, setStatusFilter] = useState<'all' | AiTaskStatus>('all');
  const [error, setError] = useState<string | null>(null);

  const tasks = data?.tasks ?? [];

  const kpis = useMemo(() => {
    const total = tasks.length;
    const inProgress = tasks.filter((t) => t.status === 'running').length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const failed = tasks.filter((t) => t.status === 'failed').length;
    const creditsUsed = tasks.reduce((sum, t) => sum + (t.creditsUsed ?? 0), 0);
    return { total, inProgress, completed, failed, creditsUsed };
  }, [tasks]);

  const filteredTasks = useMemo(() => (statusFilter === 'all' ? tasks : tasks.filter((t) => t.status === statusFilter)), [tasks, statusFilter]);

  const inQueue = tasks.filter((t) => t.status === 'queued' || t.status === 'running').length;
  const failureRate = tasks.length >= 5 ? Math.round((kpis.failed / tasks.length) * 100) : null;

  const recentCompletions = useMemo(
    () =>
      tasks
        .filter((t) => t.status === 'completed' && t.completedAt)
        .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
        .slice(0, 5),
    [tasks]
  );

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 lg:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-ink-900 dark:text-white">
            <Sparkles className="h-5 w-5 text-violet-500" /> AI Tasks
          </h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Monitor and manage your AI-powered background tasks.</p>
        </div>
        <Button
          loading={createTask.isPending}
          onClick={() => {
            setError(null);
            createTask.mutate(undefined, { onError: () => setError('Could not create the task — try again in a moment.') });
          }}
        >
          <Sparkles className="h-4 w-4" /> Summarize my unread conversations
        </Button>
      </div>

      <CopilotNavStrip current="ai-tasks" />

      {error && (
        <div className="mt-4 flex items-center justify-between rounded-panel border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          {error}
          <button type="button" onClick={() => setError(null)} aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiTile label="Total tasks" value={kpis.total} icon={<FileText className="h-4 w-4 text-ink-500" />} />
        <KpiTile label="In progress" value={kpis.inProgress} icon={<Loader2 className="h-4 w-4 text-brand-600" />} />
        <KpiTile label="Completed" value={kpis.completed} icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />} />
        <KpiTile label="Failed" value={kpis.failed} icon={<AlertTriangle className="h-4 w-4 text-red-500" />} />
        <KpiTile label="Credits used" value={kpis.creditsUsed} icon={<Database className="h-4 w-4 text-ink-500" />} />
      </div>
      <p className="mt-1.5 text-xs text-ink-400 dark:text-ink-500">
        No “Needs review” status is set by this backend yet, so that tile is omitted rather than shown as a fabricated zero.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0 rounded-panel border border-ink-100 bg-white shadow-surface dark:border-ink-800 dark:bg-ink-900">
          <div className="flex flex-wrap items-center gap-2 border-b border-ink-100 px-4 py-3 dark:border-ink-800">
            {(['all', 'queued', 'running', 'completed', 'failed', 'cancelled'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors',
                  statusFilter === s
                    ? 'bg-brand-600 text-white'
                    : 'bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300 dark:hover:bg-ink-700'
                )}
              >
                {s === 'all' ? 'All statuses' : s}
              </button>
            ))}
          </div>

          {isLoading && (
            <div className="flex justify-center py-14">
              <Loader2 className="h-5 w-5 animate-spin text-ink-300" />
            </div>
          )}

          {!isLoading && filteredTasks.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">No tasks yet</p>
              <p className="mt-1 text-sm text-ink-400 dark:text-ink-500">
                Run “Summarize my unread conversations” above to create your first task.
              </p>
            </div>
          )}

          {!isLoading && filteredTasks.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-ink-100 text-xs font-semibold uppercase tracking-wide text-ink-400 dark:border-ink-800 dark:text-ink-500">
                    <th className="px-4 py-2">Task</th>
                    <th className="px-2 py-2">Requester</th>
                    <th className="px-2 py-2">Priority</th>
                    <th className="px-2 py-2">Progress</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2">Output</th>
                    <th className="px-2 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map((t) => (
                    <TaskRow key={t.id} task={t} onCancel={() => cancelTask.mutate(t.id)} cancelling={cancelTask.isPending && cancelTask.variables === t.id} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-panel border border-ink-100 bg-white p-4 shadow-surface dark:border-ink-800 dark:bg-ink-900">
            <h2 className="text-sm font-bold text-ink-900 dark:text-white">Queue health</h2>
            <dl className="mt-3 space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-ink-500 dark:text-ink-400">Tasks in queue</dt>
                <dd className="font-semibold text-ink-900 dark:text-white">{inQueue}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-ink-500 dark:text-ink-400">Failure rate</dt>
                <dd className="font-semibold text-ink-900 dark:text-white">{failureRate === null ? 'Not enough data yet' : `${failureRate}%`}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-panel border border-ink-100 bg-white p-4 shadow-surface dark:border-ink-800 dark:bg-ink-900">
            <h2 className="text-sm font-bold text-ink-900 dark:text-white">Recent completions</h2>
            {recentCompletions.length === 0 ? (
              <p className="mt-2 text-xs text-ink-400 dark:text-ink-500">No completed tasks yet.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {recentCompletions.map((t) => (
                  <li key={t.id} className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink-900 dark:text-white">{taskTypeLabel(t.taskType)}</p>
                      <p className="text-xs text-ink-400 dark:text-ink-500">{formatDistanceToNowStrict(new Date(t.completedAt!), { addSuffix: true })}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiTile({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-panel border border-ink-100 bg-white p-3.5 shadow-surface dark:border-ink-800 dark:bg-ink-900">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">{label}</span>
        {icon}
      </div>
      <p className="mt-1.5 text-2xl font-bold text-ink-900 dark:text-white">{value.toLocaleString()}</p>
    </div>
  );
}

function outputSummary(task: AiTask): string {
  if (task.status !== 'completed' || !task.outputRef) return '—';
  const { summarizedCount, totalConversations } = task.outputRef;
  if (typeof summarizedCount === 'number' && typeof totalConversations === 'number') {
    return `Summarized ${summarizedCount} of ${totalConversations} conversations`;
  }
  if (typeof summarizedCount === 'number') return `Summarized ${summarizedCount} conversations`;
  return '—';
}

function TaskRow({ task, onCancel, cancelling }: { task: AiTask; onCancel: () => void; cancelling: boolean }) {
  const canCancel = task.status === 'queued' || task.status === 'running';
  return (
    <tr className="border-b border-ink-50 align-top last:border-b-0 hover:bg-ink-50/60 dark:border-ink-800/60 dark:hover:bg-ink-800/40">
      <td className="px-4 py-3">
        <p className="text-sm font-semibold text-ink-900 dark:text-white">{taskTypeLabel(task.taskType)}</p>
        <p className="text-xs text-ink-400 dark:text-ink-500">#{task.id.slice(0, 8)}</p>
      </td>
      <td className="px-2 py-3 text-sm text-ink-600 dark:text-ink-300">You</td>
      <td className="px-2 py-3 text-sm capitalize text-ink-600 dark:text-ink-300">{task.priority ?? '—'}</td>
      <td className="px-2 py-3">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
            <div
              className={cn('h-full rounded-full', task.status === 'failed' ? 'bg-red-500' : 'bg-brand-600')}
              style={{ width: `${Math.max(0, Math.min(100, task.progress ?? 0))}%` }}
            />
          </div>
          <span className="text-xs text-ink-500 dark:text-ink-400">{Math.round(task.progress ?? 0)}%</span>
        </div>
      </td>
      <td className="px-2 py-3">
        <Badge tone={STATUS_TONE[task.status]} className="capitalize">
          {task.status}
        </Badge>
      </td>
      <td className="max-w-[220px] px-2 py-3">
        <p className="line-clamp-2 text-sm text-ink-600 dark:text-ink-300">{outputSummary(task)}</p>
      </td>
      <td className="px-2 py-3">
        <Button variant="outline" size="sm" disabled={!canCancel} loading={cancelling} onClick={onCancel}>
          Cancel
        </Button>
      </td>
    </tr>
  );
}
