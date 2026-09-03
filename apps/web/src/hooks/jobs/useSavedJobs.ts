'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Job, JobListMeta } from './types';

/** GET /jobs/saved — auth required, jobs the user has saved (join job_saves). */
export function useSavedJobs() {
  return useQuery({
    queryKey: ['jobs', 'saved'],
    queryFn: async () => {
      const { data } = await api.get<{ data: Job[]; meta: JobListMeta }>('/jobs/saved');
      return data;
    },
  });
}

export function useUnsaveJobFromList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (jobId: string) => {
      await api.delete(`/jobs/${jobId}/save`);
      return jobId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs', 'saved'] });
      queryClient.invalidateQueries({ queryKey: ['jobs', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['jobs', 'recommended'] });
    },
  });
}
