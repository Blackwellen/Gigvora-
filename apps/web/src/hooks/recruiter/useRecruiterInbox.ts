'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { RecruiterInboxThread } from './types';

/** GET /recruiter-inbox — filtered view over the platform messaging system (20.08). */
export function useRecruiterInbox(status: 'active' | 'snoozed' | 'archived' | 'all' = 'active') {
  return useQuery({
    queryKey: ['recruiter', 'inbox', status],
    queryFn: async () => {
      const { data } = await api.get<{ data: RecruiterInboxThread[]; meta: { total: number } }>('/recruiter-inbox', { params: { status } });
      return data;
    },
    refetchInterval: 30_000,
  });
}

export function useStartInboxThread() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { candidate_id: string; project_id?: string }) => {
      const { data } = await api.post('/recruiter-inbox/threads', body);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recruiter', 'inbox'] }),
  });
}

export function useUpdateInboxThreadStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'active' | 'snoozed' | 'archived' }) => {
      const { data } = await api.patch(`/recruiter-inbox/threads/${id}/status`, { status });
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recruiter', 'inbox'] }),
  });
}

// Real messages/send/read for a thread's conversation reuse the existing
// messaging module directly (GET/POST /messaging/:id/messages, POST
// /messaging/:id/read) — recruiter-inbox only tags + filters which
// conversations show up here, it is not a parallel messaging system.
export function useConversationMessages(conversationId: string | undefined) {
  return useQuery({
    queryKey: ['recruiter', 'inbox', 'messages', conversationId],
    queryFn: async () => {
      const { data } = await api.get(`/messaging/${conversationId}/messages`);
      return data.data as Array<{ id: string; body: string; senderId: string; senderName: string; createdAt: string }>;
    },
    enabled: Boolean(conversationId),
    refetchInterval: 10_000,
  });
}

export function useSendConversationMessage(conversationId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      const { data } = await api.post(`/messaging/${conversationId}/messages`, { body });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruiter', 'inbox', 'messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['recruiter', 'inbox'] });
    },
  });
}

export function useMarkConversationRead(conversationId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.post(`/messaging/${conversationId}/read`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recruiter', 'inbox'] }),
  });
}
