'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { JobAlert, JobAlertInput, JobListMeta } from './types';

/** GET /job-alerts — the caller's saved search alerts. */
export function useJobAlerts() {
  return useQuery({
    queryKey: ['job-alerts', 'list'],
    queryFn: async () => {
      const { data } = await api.get<{ data: JobAlert[]; meta: JobListMeta }>('/job-alerts');
      return data;
    },
  });
}

export function useCreateJobAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: JobAlertInput) => {
      const { data } = await api.post<{ data: JobAlert }>('/job-alerts', input);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['job-alerts', 'list'] }),
  });
}

export function useUpdateJobAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<JobAlertInput> }) => {
      const { data } = await api.patch<{ data: JobAlert }>(`/job-alerts/${id}`, patch);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['job-alerts', 'list'] }),
  });
}

export function useDeleteJobAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/job-alerts/${id}`);
      return id;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['job-alerts', 'list'] }),
  });
}
