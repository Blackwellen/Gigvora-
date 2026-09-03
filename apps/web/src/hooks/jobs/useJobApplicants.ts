'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Application, ApplicationStatus } from './types';

export type JobApplicantsFilter = { stage?: ApplicationStatus; q?: string };

export function useJobApplicants(jobId: string | undefined, filter: JobApplicantsFilter = {}) {
  return useQuery({
    queryKey: ['jobs', 'applicants', jobId, filter],
    queryFn: async () => {
      const { data } = await api.get<{ data: Application[]; meta: { total: number } }>(`/jobs/${jobId}/applicants`, {
        params: filter,
      });
      return data;
    },
    enabled: Boolean(jobId),
    retry: 1,
  });
}

export function useUpdateApplicationStatus(jobId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ applicationId, status }: { applicationId: string; status: ApplicationStatus }) => {
      const { data } = await api.patch<{ data: Application }>(`/applications/${applicationId}`, { status });
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['jobs', 'applicants', jobId] }),
  });
}
