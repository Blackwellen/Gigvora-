'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PmTask, PmTaskPriority, PmTaskStatus } from './types';

export type TaskFilter = { status?: string; assigneeId?: string; priority?: string; search?: string };

export function useProjectTasks(projectId: string | undefined, filter: TaskFilter = {}) {
  return useQuery({
    queryKey: ['pm-projects', projectId, 'tasks', filter],
    queryFn: async () => {
      const { data } = await api.get<{ data: PmTask[] }>(`/pm-projects/${projectId}/tasks`, { params: filter });
      return data.data;
    },
    enabled: Boolean(projectId),
  });
}

export function useCreateTask(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; description?: string; priority?: PmTaskPriority; assigneeId?: string; dueDate?: string; boardColumn?: string }) => {
      const { data } = await api.post<{ data: PmTask }>(`/pm-projects/${projectId}/tasks`, input);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-projects', projectId, 'tasks'] });
      queryClient.invalidateQueries({ queryKey: ['pm-projects', projectId, 'board'] });
      queryClient.invalidateQueries({ queryKey: ['pm-projects', 'detail', projectId] });
    },
  });
}

export function useUpdateTask(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, patch }: { taskId: string; patch: Partial<PmTask> & { status?: PmTaskStatus } }) => {
      const { data } = await api.patch<{ data: PmTask }>(`/pm-projects/${projectId}/tasks/${taskId}`, patch);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-projects', projectId, 'tasks'] });
      queryClient.invalidateQueries({ queryKey: ['pm-projects', projectId, 'board'] });
    },
  });
}

/**
 * Client-side mirror of the backend's rule-based ordering
 * (apps/api/src/modules/pm-projects/tasks.service.js#sortBySuggestedOrder) —
 * due date first, then priority. Deliberately not an ML/AI score: see the
 * "Suggested order" toggle copy on the Tasks page for why.
 */
const PRIORITY_WEIGHT: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
export function sortBySuggestedOrderClient(tasks: PmTask[]): PmTask[] {
  return [...tasks].sort((a, b) => {
    const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
    const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
    if (aDue !== bDue) return aDue - bDue;
    return (PRIORITY_WEIGHT[a.priority] ?? 9) - (PRIORITY_WEIGHT[b.priority] ?? 9);
  });
}

export function useDeleteTask(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string) => api.delete(`/pm-projects/${projectId}/tasks/${taskId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-projects', projectId, 'tasks'] });
      queryClient.invalidateQueries({ queryKey: ['pm-projects', projectId, 'board'] });
    },
  });
}
