'use client';

// Backed by GET/POST /ai-actions and /ai-actions/:id/decide — apps/api Domain 25
// (AI governance), verified end-to-end: approving a pending action REALLY sends
// the message via the canonical messaging system. This backend currently wires
// up exactly one real action type (`send_message_reply`, created via
// POST /ai-actions/draft-reply) — no candidate-shortlist/enrichment/outreach
// action types exist yet, so this file intentionally only models that one shape.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useSocketEvent } from '@/hooks/useChatSocket';

export type AiActionStatus = 'pending' | 'approved' | 'rejected' | 'executed';

export type AiActionPayload = {
  draftBody: string;
  safetyLabel?: string | null;
  reasonCodes: string[];
  conversationId: string;
};

export type AiAction = {
  id: string;
  actionType: 'send_message_reply';
  targetType: 'conversation';
  targetId: string;
  status: AiActionStatus;
  riskScore: number;
  approvalRequirement: string | null;
  payload: AiActionPayload;
  result: { messageId?: string } | null;
  createdAt: string;
  updatedAt: string;
};

const LIST_KEY = (status?: string) => ['ai-actions', status ?? 'all'] as const;

export function useAiActions(status?: AiActionStatus) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: LIST_KEY(status),
    queryFn: async () => (await api.get<{ data: AiAction[] }>('/ai-actions', { params: status ? { status } : undefined })).data.data,
    retry: false,
  });

  function patchAction(actionId: string, patch: Partial<AiAction>) {
    queryClient.setQueriesData<AiAction[] | undefined>({ queryKey: ['ai-actions'] }, (old) => {
      if (!old) return old;
      return old.map((a) => (a.id === actionId ? { ...a, ...patch } : a));
    });
    queryClient.setQueryData<AiAction | undefined>(['ai-action', actionId], (old) => (old ? { ...old, ...patch } : old));
  }

  useSocketEvent<{ actionId: string; actionType: string; riskScore: number }>('ai.approval.required', () => {
    queryClient.invalidateQueries({ queryKey: ['ai-actions'] });
  });

  useSocketEvent<{ actionId: string; decision: string }>('ai.approval.decided', (payload) => {
    patchAction(payload.actionId, { status: payload.decision === 'approved' ? 'executed' : (payload.decision as AiActionStatus) });
    queryClient.invalidateQueries({ queryKey: ['ai-actions'] });
  });

  return query;
}

export function useAiAction(id: string | null) {
  return useQuery({
    queryKey: ['ai-action', id],
    queryFn: async () => (await api.get<{ data: AiAction }>(`/ai-actions/${id}`)).data.data,
    enabled: Boolean(id),
    retry: false,
  });
}

export function useCreateDraftReplyAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { conversationId: string; draftBody: string }) =>
      (await api.post<{ data: AiAction }>('/ai-actions/draft-reply', input)).data.data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-actions'] }),
  });
}

export function useDecideAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ actionId, decision, reason }: { actionId: string; decision: 'approved' | 'rejected'; reason?: string }) =>
      (await api.post<{ data: AiAction }>(`/ai-actions/${actionId}/decide`, { decision, reason })).data.data,
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['ai-actions'] });
      queryClient.setQueryData(['ai-action', updated.id], updated);
    },
  });
}
