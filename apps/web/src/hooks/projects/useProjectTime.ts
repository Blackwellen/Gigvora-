'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PmTimeEntry } from './types';

export function useProjectTimeEntries(projectId: string | undefined, mine = false) {
  return useQuery({
    queryKey: ['pm-projects', projectId, 'time-entries', mine],
    queryFn: async () => {
      const { data } = await api.get<{ data: PmTimeEntry[] }>(`/pm-projects/${projectId}/time-entries`, { params: mine ? { mine: 'true' } : undefined });
      return data.data;
    },
    enabled: Boolean(projectId),
  });
}

export function useLogTime(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { taskId?: string; occurredOn: string; minutes: number; notes?: string; billable?: boolean }) => {
      const { data } = await api.post<{ data: PmTimeEntry }>(`/pm-projects/${projectId}/time-entries`, input);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pm-projects', projectId, 'time-entries'] }),
  });
}

export function useStartTimer(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (taskId?: string) => {
      const { data } = await api.post<{ data: PmTimeEntry }>(`/pm-projects/${projectId}/time-entries/timer/start`, { taskId });
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pm-projects', projectId, 'time-entries'] }),
  });
}

export function useStopTimer(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entryId: string) => {
      const { data } = await api.post<{ data: PmTimeEntry }>(`/pm-projects/${projectId}/time-entries/timer/${entryId}/stop`);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pm-projects', projectId, 'time-entries'] }),
  });
}

export function useDeleteTimeEntry(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entryId: string) => api.delete(`/pm-projects/${projectId}/time-entries/${entryId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pm-projects', projectId, 'time-entries'] }),
  });
}
