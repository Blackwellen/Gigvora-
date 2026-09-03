'use client';

// Backed by GET/POST /ai-tasks — apps/api Domain 25 (AI governance), verified
// end-to-end via real BullMQ (queued -> running -> completed). The only
// registered taskType right now is `bulk_conversation_summary` — any other
// taskType is rejected with a 422, so this file intentionally exposes a single
// honest creation hook rather than a generic multi-workflow task creator.
// Real-time updates arrive on the user's own socket room via ai.task.started /
// ai.task.progress / ai.task.completed / ai.task.failed and are used here to
// patch the react-query cache directly so the UI updates without polling.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useSocketEvent } from '@/hooks/useChatSocket';

export type AiTaskStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export type AiTask = {
  id: string;
  taskType: 'bulk_conversation_summary' | string;
  status: AiTaskStatus;
  priority: string | null;
  progress: number | null;
  costEstimate: number | null;
  creditsUsed: number | null;
  inputRef: unknown;
  outputRef: { summarizedCount?: number; totalConversations?: number; [k: string]: unknown } | null;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AiTaskEvent = { eventType: string; metadata: unknown; createdAt: string };

export type AiTaskDetail = AiTask & { events: AiTaskEvent[] };

const LIST_KEY = (status?: string) => ['ai-tasks', status ?? 'all'] as const;

export function useAiTasks(status?: AiTaskStatus) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: LIST_KEY(status),
    queryFn: async () =>
      (await api.get<{ data: { total: number; tasks: AiTask[] } }>('/ai-tasks', { params: status ? { status } : undefined })).data.data,
    retry: false,
  });

  function patchTask(taskId: string, patch: Partial<AiTask>) {
    queryClient.setQueriesData<{ total: number; tasks: AiTask[] } | undefined>({ queryKey: ['ai-tasks'] }, (old) => {
      if (!old) return old;
      let found = false;
      const tasks = old.tasks.map((t) => {
        if (t.id !== taskId) return t;
        found = true;
        return { ...t, ...patch };
      });
      if (!found) return old;
      return { ...old, tasks };
    });
    queryClient.setQueryData<AiTaskDetail | undefined>(['ai-task', taskId], (old) => (old ? { ...old, ...patch } : old));
  }

  useSocketEvent<{ taskId: string }>('ai.task.started', (payload) => {
    patchTask(payload.taskId, { status: 'running', startedAt: new Date().toISOString() });
  });

  useSocketEvent<{ taskId: string; progress: number }>('ai.task.progress', (payload) => {
    patchTask(payload.taskId, { status: 'running', progress: payload.progress });
  });

  useSocketEvent<{ taskId: string; output: AiTask['outputRef'] }>('ai.task.completed', (payload) => {
    patchTask(payload.taskId, { status: 'completed', progress: 100, outputRef: payload.output, completedAt: new Date().toISOString() });
    queryClient.invalidateQueries({ queryKey: ['ai-tasks'] });
  });

  useSocketEvent<{ taskId: string; reason: string }>('ai.task.failed', (payload) => {
    patchTask(payload.taskId, { status: 'failed', failedAt: new Date().toISOString() });
    queryClient.invalidateQueries({ queryKey: ['ai-tasks'] });
  });

  return query;
}

export function useAiTask(id: string | null) {
  return useQuery({
    queryKey: ['ai-task', id],
    queryFn: async () => (await api.get<{ data: AiTaskDetail }>(`/ai-tasks/${id}`)).data.data,
    enabled: Boolean(id),
    retry: false,
  });
}

/** Creates the one real task type this backend supports today: a bulk summary of the caller's unread conversations. */
export function useCreateBulkSummaryTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input?: { inputRef?: unknown; priority?: string }) =>
      (
        await api.post<{ data: AiTask }>('/ai-tasks', {
          taskType: 'bulk_conversation_summary',
          inputRef: input?.inputRef,
          priority: input?.priority,
        })
      ).data.data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-tasks'] }),
  });
}

export function useCancelAiTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string) => (await api.post<{ data: AiTask }>(`/ai-tasks/${taskId}/cancel`)).data.data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-tasks'] }),
  });
}
