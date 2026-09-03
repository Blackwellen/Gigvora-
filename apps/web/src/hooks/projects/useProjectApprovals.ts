'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PmApproval } from './types';

export function useProjectApprovals(projectId: string | undefined, status?: string) {
  return useQuery({
    queryKey: ['pm-projects', projectId, 'approvals', status],
    queryFn: async () => {
      const { data } = await api.get<{ data: PmApproval[] }>(`/pm-projects/${projectId}/approvals`, { params: status ? { status } : undefined });
      return data.data;
    },
    enabled: Boolean(projectId),
  });
}

export function useRequestApproval(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { objectType: string; objectId: string; mode?: string; approverIds: string[] }) => {
      const { data } = await api.post<{ data: PmApproval }>(`/pm-projects/${projectId}/approvals`, input);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pm-projects', projectId, 'approvals'] }),
  });
}

export function useDecideApproval(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ approvalId, decision, comment }: { approvalId: string; decision: 'approved' | 'rejected'; comment?: string }) => {
      const { data } = await api.post<{ data: PmApproval }>(`/pm-projects/${projectId}/approvals/${approvalId}/decide`, { decision, comment });
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pm-projects', projectId, 'approvals'] }),
  });
}
