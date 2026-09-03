'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Application, ApplicationStatus } from './types';

export function useApplication(applicationId: string | undefined) {
  return useQuery({
    queryKey: ['applications', 'detail', applicationId],
    queryFn: async () => {
      const { data } = await api.get<{ data: Application }>(`/applications/${applicationId}`);
      return data.data;
    },
    enabled: Boolean(applicationId),
    retry: 1,
  });
}

export function useUpdateApplicationStage(applicationId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: { status: ApplicationStatus; note?: string }) => {
      const { data } = await api.patch<{ data: Application }>(`/applications/${applicationId}`, patch);
      return data.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['applications', 'detail', applicationId], data);
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });
}
