'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { JobAnalytics } from './types';

/** GET /jobs/:id/analytics — funnel counts, source breakdown, time-to-fill, applicant quality. */
export function useJobAnalytics(jobId: string | undefined) {
  return useQuery({
    queryKey: ['jobs', jobId, 'analytics'],
    queryFn: async () => {
      const { data } = await api.get<{ data: JobAnalytics }>(`/jobs/${jobId}/analytics`);
      return data.data;
    },
    enabled: Boolean(jobId),
  });
}
