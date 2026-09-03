'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PmBid, PmBidStatus } from './types';

export function useProjectBids(projectId: string | undefined, status?: string) {
  return useQuery({
    queryKey: ['pm-projects', projectId, 'bids', status],
    queryFn: async () => {
      const { data } = await api.get<{ data: PmBid[] }>(`/pm-projects/${projectId}/bids`, { params: status ? { status } : undefined });
      return data.data;
    },
    enabled: Boolean(projectId),
  });
}

export function useSubmitBid(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { coverLetter: string; rateType?: 'fixed' | 'hourly'; proposedAmount: number; estimatedDurationDays?: number; availableFrom?: string }) => {
      const { data } = await api.post<{ data: PmBid }>(`/pm-projects/${projectId}/bids`, input);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pm-projects', projectId, 'bids'] }),
  });
}

export function useUpdateBidStatus(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ bidId, status }: { bidId: string; status: PmBidStatus }) => {
      const { data } = await api.patch<{ data: PmBid }>(`/pm-projects/${projectId}/bids/${bidId}`, { status });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-projects', projectId, 'bids'] });
      queryClient.invalidateQueries({ queryKey: ['pm-projects', projectId, 'members'] });
    },
  });
}

export function useInviteToProject(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { userId?: string; profileSlug?: string; role?: string }) => api.post(`/pm-projects/${projectId}/bids/invite`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pm-projects', projectId, 'members'] }),
  });
}
