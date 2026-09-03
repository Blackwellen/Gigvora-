'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Job, JobInput } from './types';

export function useJob(jobId: string | undefined) {
  return useQuery({
    queryKey: ['jobs', 'detail', jobId],
    queryFn: async () => {
      const { data } = await api.get<{ data: Job }>(`/jobs/${jobId}`);
      return data.data;
    },
    enabled: Boolean(jobId),
    retry: 1,
  });
}

export function useUpdateJob(jobId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<JobInput>) => {
      const { data } = await api.patch<{ data: Job }>(`/jobs/${jobId}`, patch);
      return data.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['jobs', 'detail', jobId], data);
      queryClient.invalidateQueries({ queryKey: ['jobs', 'list'] });
    },
  });
}
