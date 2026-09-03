'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PmChangeRequest, PmChangeRequestStatus } from './types';

export function useProjectChangeRequests(projectId: string | undefined) {
  return useQuery({
    queryKey: ['pm-projects', projectId, 'change-requests'],
    queryFn: async () => {
      const { data } = await api.get<{ data: PmChangeRequest[] }>(`/pm-projects/${projectId}/change-requests`);
      return data.data;
    },
    enabled: Boolean(projectId),
  });
}

export function useCreateChangeRequest(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; description: string; reason?: string; scopeImpact?: string; dateImpactDays?: number; costImpact?: number }) => {
      const { data } = await api.post<{ data: PmChangeRequest }>(`/pm-projects/${projectId}/change-requests`, input);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pm-projects', projectId, 'change-requests'] }),
  });
}

export function useUpdateChangeRequestStatus(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ changeRequestId, status }: { changeRequestId: string; status: PmChangeRequestStatus }) => {
      const { data } = await api.patch<{ data: PmChangeRequest }>(`/pm-projects/${projectId}/change-requests/${changeRequestId}`, { status });
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pm-projects', projectId, 'change-requests'] }),
  });
}
