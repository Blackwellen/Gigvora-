'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Job, JobEmploymentType, JobListMeta, JobSeniority, JobWorkMode } from './types';

export type JobsFilter = {
  q?: string;
  location?: string;
  country_code?: string;
  work_mode?: JobWorkMode;
  employment_type?: JobEmploymentType;
  category?: string;
  seniority?: JobSeniority;
  salary_min?: number;
  salary_max?: number;
  sort?: 'relevance' | 'newest' | 'trending' | 'salary_desc';
  limit?: number;
  offset?: number;
  status?: 'open' | 'draft' | 'closed' | 'archived';
};

/** GET /jobs — powers Job Search (16.02) and the trending/recent list on Jobs Home (16.01). */
export function useJobs(filter: JobsFilter = {}) {
  return useQuery({
    queryKey: ['jobs', 'list', filter],
    queryFn: async () => {
      const { data } = await api.get<{ data: Job[]; meta: JobListMeta }>('/jobs', { params: filter });
      return data;
    },
  });
}

export function useSaveJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (jobId: string) => {
      await api.post(`/jobs/${jobId}/save`);
      return jobId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['jobs', 'recommended'] });
      queryClient.invalidateQueries({ queryKey: ['jobs', 'saved'] });
      queryClient.invalidateQueries({ queryKey: ['jobs', 'detail'] });
    },
  });
}

export function useUnsaveJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (jobId: string) => {
      await api.delete(`/jobs/${jobId}/save`);
      return jobId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['jobs', 'recommended'] });
      queryClient.invalidateQueries({ queryKey: ['jobs', 'saved'] });
      queryClient.invalidateQueries({ queryKey: ['jobs', 'detail'] });
    },
  });
}
