'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type MessageRequestStatus = 'pending' | 'accepted' | 'declined' | 'spam';

export type MessageRequestSource = {
  type: 'profile' | 'company' | null;
  mutualConnections?: number;
  channel?: 'search' | 'job_post' | 'website' | string;
};

export type MessageRequestItem = {
  id: string;
  senderId: string;
  senderName: string;
  senderTitle?: string | null;
  senderCompany?: string | null;
  senderAvatarUrl?: string | null;
  preview: string;
  source?: MessageRequestSource;
  context?: { company?: string | null; location?: string | null } | null;
  status: MessageRequestStatus;
  createdAt: string;
  /** Real computed relevance score in [0,1] from the backend. Undefined/null means
   * "not computed yet" — callers must omit the match badge rather than invent one. */
  relevanceScore?: number | null;
  /** Real safety classification from the backend, when available. */
  safety?: { label: 'spam' | 'scam' | 'safe' | string; confidence?: number } | null;
};

/**
 * Fetches message requests, optionally filtered by status. The
 * /message-requests endpoints are being built concurrently by another agent
 * (Phase 1 messaging platform), so this degrades gracefully — a 404 or any
 * network failure resolves to an empty, "degraded" result instead of
 * throwing, mirroring the usePublicChannels pattern in useChatBubbleData.ts.
 * Swap in real filtering/pagination params here once the backend contract
 * is confirmed; the shape below already matches the planned contract.
 */
export function useMessageRequests(status?: MessageRequestStatus) {
  return useQuery({
    queryKey: ['message-requests', status ?? 'all'],
    queryFn: async (): Promise<{ data: MessageRequestItem[]; degraded: boolean }> => {
      try {
        const res = await api.get<{ data: MessageRequestItem[] }>('/message-requests', {
          params: status ? { status } : undefined,
        });
        return { data: res.data.data ?? [], degraded: false };
      } catch {
        return { data: [], degraded: true };
      }
    },
    retry: false,
    refetchInterval: 15_000,
  });
}

function useMessageRequestMutation(action: 'accept' | 'decline' | 'block' | 'spam') {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.post<{ data: MessageRequestItem }>(`/message-requests/${id}/${action}`)).data.data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-requests'] });
      // Accepting moves the sender into the normal Inbox, so refresh that too.
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useAcceptMessageRequest() {
  return useMessageRequestMutation('accept');
}

export function useDeclineMessageRequest() {
  return useMessageRequestMutation('decline');
}

export function useBlockMessageRequest() {
  return useMessageRequestMutation('block');
}

export function useMarkSpamMessageRequest() {
  return useMessageRequestMutation('spam');
}
