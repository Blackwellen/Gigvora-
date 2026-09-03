'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { BusinessInterview } from './types';
import type { InterviewStatus } from '@/hooks/jobs/types';

export type BusinessInterviewsFilter = { from?: string; to?: string; status?: InterviewStatus; interviewer_id?: string };

/** GET /business-interviews — cross-job interview calendar/agenda (19.12). */
export function useBusinessInterviews(filter: BusinessInterviewsFilter = {}) {
  return useQuery({
    queryKey: ['business-interviews', 'list', filter],
    queryFn: async () => {
      const { data } = await api.get<{ data: BusinessInterview[]; meta: { total: number } }>('/business-interviews', { params: filter });
      return data;
    },
  });
}

export function useBusinessInterview(id: string | undefined) {
  return useQuery({
    queryKey: ['business-interviews', 'detail', id],
    queryFn: async () => {
      const { data } = await api.get<{ data: BusinessInterview }>(`/business-interviews/${id}`);
      return data.data;
    },
    enabled: Boolean(id),
    retry: 1,
  });
}
