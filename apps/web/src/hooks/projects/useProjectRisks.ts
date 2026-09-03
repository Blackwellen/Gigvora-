'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PmRisk, PmRiskKind, PmRiskStatus } from './types';

export function useProjectRisks(projectId: string | undefined, kind?: PmRiskKind) {
  return useQuery({
    queryKey: ['pm-projects', projectId, 'risks', kind],
    queryFn: async () => {
      const { data } = await api.get<{ data: PmRisk[] }>(`/pm-projects/${projectId}/risks`, { params: kind ? { kind } : undefined });
      return data.data;
    },
    enabled: Boolean(projectId),
  });
}

export function useCreateRisk(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { kind: PmRiskKind; title: string; description?: string; probability?: string; impact?: string; severity?: string; mitigation?: string; dueDate?: string }) => {
      const { data } = await api.post<{ data: PmRisk }>(`/pm-projects/${projectId}/risks`, input);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pm-projects', projectId, 'risks'] }),
  });
}

export function useUpdateRisk(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ riskId, patch }: { riskId: string; patch: Partial<PmRisk> & { status?: PmRiskStatus } }) => {
      const { data } = await api.patch<{ data: PmRisk }>(`/pm-projects/${projectId}/risks/${riskId}`, patch);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pm-projects', projectId, 'risks'] }),
  });
}
