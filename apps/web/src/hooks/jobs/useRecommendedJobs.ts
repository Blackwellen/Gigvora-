'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Job, JobListMeta } from './types';

/** GET /jobs/recommended — auth required, jobs ranked with a server-computed 0-100 match_score. */
export function useRecommendedJobs(limit?: number) {
  return useQuery({
    queryKey: ['jobs', 'recommended', limit],
    queryFn: async () => {
      const { data } = await api.get<{ data: Job[]; meta: JobListMeta }>('/jobs/recommended', { params: limit ? { limit } : undefined });
      return data;
    },
  });
}
