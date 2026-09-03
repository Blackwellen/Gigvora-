'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { BusinessApplicant, BusinessApplicantDetail, BusinessApplicantsSummary } from './types';
import type { ApplicationStatus } from '@/hooks/jobs/types';

export type BusinessApplicantsFilter = {
  job_id?: string;
  status?: ApplicationStatus;
  q?: string;
  limit?: number;
  offset?: number;
};

/** GET /business-applicants — cross-job, business-wide applicant collection (19.09). */
export function useBusinessApplicants(filter: BusinessApplicantsFilter = {}) {
  return useQuery({
    queryKey: ['business-applicants', 'list', filter],
    queryFn: async () => {
      const { data } = await api.get<{ data: BusinessApplicant[]; meta: { total: number } }>('/business-applicants', { params: filter });
      return data;
    },
  });
}

export function useBusinessApplicant(id: string | undefined) {
  return useQuery({
    queryKey: ['business-applicants', 'detail', id],
    queryFn: async () => {
      const { data } = await api.get<{ data: BusinessApplicantDetail }>(`/business-applicants/${id}`);
      return data.data;
    },
    enabled: Boolean(id),
    retry: 1,
  });
}

/** GET /business-applicants/summary — by-status counts for the KPI strip. */
export function useBusinessApplicantsSummary() {
  return useQuery({
    queryKey: ['business-applicants', 'summary'],
    queryFn: async () => {
      const { data } = await api.get<{ data: BusinessApplicantsSummary }>('/business-applicants/summary');
      return data.data;
    },
  });
}
