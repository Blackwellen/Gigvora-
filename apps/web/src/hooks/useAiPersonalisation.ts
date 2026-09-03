'use client';

// Backed by GET/PATCH /ai-personalisation (apps/api/src/modules/ai/personalisation.service.js).
// This is a small, deliberately-scoped real field set — NOT the reference
// mockup's full 12-card taxonomy. `version` is 0 when the user has never
// customized anything (defaults are being shown), and copilotOrchestrator
// appends a real addendum to the system prompt built from these fields once
// version > 0, so these preferences genuinely change Copilot's behavior.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type CommunicationStyle = 'concise' | 'balanced' | 'detailed';
export type PersonalisationTone = 'professional' | 'friendly' | 'direct';
export type ResponseFormat = 'auto' | 'bullet_points' | 'prose';

export type AiPersonalisation = {
  communicationStyle: CommunicationStyle;
  tone: PersonalisationTone;
  responseFormat: ResponseFormat;
  focusAreas: string[];
  language: string;
  version: number;
};

export const DEFAULT_AI_PERSONALISATION: AiPersonalisation = {
  communicationStyle: 'balanced',
  tone: 'professional',
  responseFormat: 'auto',
  focusAreas: [],
  language: 'en',
  version: 0,
};

export const AI_PERSONALISATION_QUERY_KEY = ['ai-personalisation'] as const;

export function useAiPersonalisation() {
  return useQuery({
    queryKey: AI_PERSONALISATION_QUERY_KEY,
    queryFn: async (): Promise<AiPersonalisation> => {
      try {
        const { data } = await api.get<{ data: Partial<AiPersonalisation> }>('/ai-personalisation');
        return { ...DEFAULT_AI_PERSONALISATION, ...data?.data };
      } catch {
        return DEFAULT_AI_PERSONALISATION;
      }
    },
    retry: false,
    throwOnError: false,
  });
}

/** Autosaves a partial patch (any subset of the real fields), optimistically
 * updating the cache with automatic rollback on failure, mirroring
 * useUpdateMessagingSettings. */
export function useUpdateAiPersonalisation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patch: Partial<AiPersonalisation>) => {
      const { data } = await api.patch<{ data: AiPersonalisation }>('/ai-personalisation', patch);
      return { ...DEFAULT_AI_PERSONALISATION, ...data?.data };
    },
    onMutate: async (patch: Partial<AiPersonalisation>) => {
      await queryClient.cancelQueries({ queryKey: AI_PERSONALISATION_QUERY_KEY });
      const previous = queryClient.getQueryData<AiPersonalisation>(AI_PERSONALISATION_QUERY_KEY);
      const base = previous ?? DEFAULT_AI_PERSONALISATION;
      queryClient.setQueryData(AI_PERSONALISATION_QUERY_KEY, { ...base, ...patch });
      return { previous };
    },
    onError: (_err, _patch, context) => {
      if (context?.previous) {
        queryClient.setQueryData(AI_PERSONALISATION_QUERY_KEY, context.previous);
      }
    },
    onSuccess: (merged) => {
      queryClient.setQueryData(AI_PERSONALISATION_QUERY_KEY, merged);
    },
  });
}
