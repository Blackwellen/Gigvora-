'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { RecruiterAnalyticsOverview } from './types';

/** GET /recruiter-analytics/overview — Recruiter Analytics (20.11). */
export function useRecruiterAnalytics() {
  return useQuery({
    queryKey: ['recruiter', 'analytics'],
    queryFn: async () => {
      const { data } = await api.get<{ data: RecruiterAnalyticsOverview }>('/recruiter-analytics/overview');
      return data.data;
    },
  });
}
