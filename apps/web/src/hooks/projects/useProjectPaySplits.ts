'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PmPaySplit } from './types';

export function useProjectPaySplits(projectId: string | undefined) {
  return useQuery({
    queryKey: ['pm-projects', projectId, 'pay-splits'],
    queryFn: async () => {
      const { data } = await api.get<{ data: PmPaySplit[] }>(`/pm-projects/${projectId}/pay-splits`);
      return data.data;
    },
    enabled: Boolean(projectId),
  });
}

export function useAddPaySplit(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { memberId: string; allocationType: 'percentage' | 'fixed'; percentage?: number; fixedAmount?: number }) => {
      const { data } = await api.post<{ data: PmPaySplit }>(`/pm-projects/${projectId}/pay-splits`, input);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pm-projects', projectId, 'pay-splits'] }),
  });
}

export function useRemovePaySplit(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (paySplitId: string) => api.delete(`/pm-projects/${projectId}/pay-splits/${paySplitId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pm-projects', projectId, 'pay-splits'] }),
  });
}
