'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { RecruiterProAnalytics } from './types';

/** GET /recruiter-pro-analytics/overview — funnel, reply rates, sequence completion (21.12). */
export function useRecruiterProAnalytics() {
  return useQuery({
    queryKey: ['recruiter-pro', 'analytics'],
    queryFn: async () => {
      const { data } = await api.get<{ data: RecruiterProAnalytics }>('/recruiter-pro-analytics/overview');
      return data.data;
    },
  });
}
