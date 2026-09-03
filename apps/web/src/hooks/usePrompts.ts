'use client';

// Backed by GET/POST /ai-prompts — apps/api Domain 25 (AI governance), verified
// end-to-end: /ai-prompts/:id/run either ACTUALLY EXECUTES the prompt's real
// actionType (summarize_conversation | generate_smart_replies) and returns the
// real model output, or — for a template-only prompt (actionType: null) —
// returns the raw template text for the caller to insert/copy. Nothing here
// fabricates output.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type PromptActionType = 'summarize_conversation' | 'generate_smart_replies' | null;

export type AiPrompt = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  promptTemplate: string;
  actionType: PromptActionType;
  tags: string[];
  usageCount: number;
  ratingAvg: number | null;
  isPublic: boolean;
  ownerUserId: string | null;
  createdAt: string;
};

export type RunPromptResult =
  | { mode: 'executed'; actionType: 'summarize_conversation'; result: { ok: boolean; summary: string; model: string; usage?: unknown } }
  | { mode: 'executed'; actionType: 'generate_smart_replies'; result: { ok: boolean; replies: string[]; model: string; usage?: unknown } }
  | { mode: 'template'; template: string };

export function usePrompts(category?: string) {
  return useQuery({
    queryKey: ['ai-prompts', category ?? 'all'],
    queryFn: async () => (await api.get<{ data: AiPrompt[] }>('/ai-prompts', { params: category ? { category } : undefined })).data.data,
    retry: false,
  });
}

export function useCreatePrompt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      description?: string;
      category?: string;
      promptTemplate: string;
      actionType?: PromptActionType;
      tags?: string[];
      isPublic?: boolean;
    }) => (await api.post<{ data: AiPrompt }>('/ai-prompts', input)).data.data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-prompts'] }),
  });
}

export function useRunPrompt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ promptId, context }: { promptId: string; context?: { conversationId?: string } }) =>
      (await api.post<{ data: RunPromptResult }>(`/ai-prompts/${promptId}/run`, { context })).data.data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-prompts'] }),
  });
}
