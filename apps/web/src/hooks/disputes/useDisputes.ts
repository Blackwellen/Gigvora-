'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Dispute, DisputeEvidence, DisputeMessage, DisputeStage } from './types';

export function useDisputesForObject(objectType: string, objectId: string | undefined) {
  return useQuery({
    queryKey: ['disputes', objectType, objectId],
    queryFn: async () => {
      const { data } = await api.get<{ data: Dispute[] }>('/disputes', { params: { objectType, objectId } });
      return data.data;
    },
    enabled: Boolean(objectId),
  });
}

export function useOpenDispute(objectType: string, objectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reason: string) => {
      const { data } = await api.post<{ data: Dispute }>('/disputes', { objectType, objectId, reason });
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['disputes', objectType, objectId] }),
  });
}

export function useDispute(disputeId: string | undefined) {
  return useQuery({
    queryKey: ['disputes', 'detail', disputeId],
    queryFn: async () => {
      const { data } = await api.get<{ data: Dispute }>(`/disputes/${disputeId}`);
      return data.data;
    },
    enabled: Boolean(disputeId),
  });
}

export function useDisputeEvidence(disputeId: string | undefined) {
  return useQuery({
    queryKey: ['disputes', disputeId, 'evidence'],
    queryFn: async () => {
      const { data } = await api.get<{ data: DisputeEvidence[] }>(`/disputes/${disputeId}/evidence`);
      return data.data;
    },
    enabled: Boolean(disputeId),
  });
}

export function useSubmitEvidence(disputeId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ description, file }: { description: string; file?: File }) => {
      const form = new FormData();
      form.append('description', description);
      if (file) form.append('file', file);
      const { data } = await api.post<{ data: DisputeEvidence }>(`/disputes/${disputeId}/evidence`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['disputes', disputeId, 'evidence'] }),
  });
}

export function useDisputeMessages(disputeId: string | undefined) {
  return useQuery({
    queryKey: ['disputes', disputeId, 'messages'],
    queryFn: async () => {
      const { data } = await api.get<{ data: DisputeMessage[] }>(`/disputes/${disputeId}/messages`);
      return data.data;
    },
    enabled: Boolean(disputeId),
  });
}

export function usePostDisputeMessage(disputeId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      const { data } = await api.post<{ data: DisputeMessage }>(`/disputes/${disputeId}/messages`, { body });
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['disputes', disputeId, 'messages'] }),
  });
}

export function useTransitionDispute(disputeId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { stage: DisputeStage; resolutionNote?: string; resolvedSplitPct?: number }) => {
      const { data } = await api.post<{ data: Dispute }>(`/disputes/${disputeId}/transition`, input);
      return data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['disputes', 'detail', disputeId] });
      queryClient.invalidateQueries({ queryKey: ['disputes', data.objectType, data.objectId] });
    },
  });
}
