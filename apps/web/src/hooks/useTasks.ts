'use client';

// Backed by GET/PATCH /api/v1/tasks — apps/api/src/modules/tasks.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';

export type TaskItem = {
  id: string;
  title: string;
  dueDate: string | null;
  status: TaskStatus;
  priority: TaskPriority;
};

type RawTask = {
  id: string;
  title: string;
  dueDate?: string | null;
  due_date?: string | null;
  dueAt?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
};

function mapTask(raw: RawTask): TaskItem {
  return {
    id: raw.id,
    title: raw.title,
    dueDate: raw.dueDate ?? raw.due_date ?? raw.dueAt ?? null,
    status: raw.status,
    priority: raw.priority,
  };
}

const QUERY_KEY = ['tasks', 'open'];

export function useTasks(limit = 8) {
  return useQuery({
    queryKey: [...QUERY_KEY, limit],
    queryFn: async () => {
      const { data } = await api.get<{ data: RawTask[] }>('/tasks', { params: { status: 'open', limit } });
      return data.data.map(mapTask);
    },
    retry: 1,
  });
}

export function useCompleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => api.patch(`/tasks/${id}`, { status: 'completed' }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const snapshots = queryClient.getQueriesData<TaskItem[]>({ queryKey: ['tasks'] });
      snapshots.forEach(([key, value]) => {
        if (!value) return;
        queryClient.setQueryData(key, value.filter((t) => t.id !== id));
      });
      return { snapshots };
    },
    onError: (_err, _vars, context) => {
      context?.snapshots.forEach(([key, value]) => queryClient.setQueryData(key, value));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });
}
