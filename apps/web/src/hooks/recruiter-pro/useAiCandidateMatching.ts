'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { AiCandidateMatch, MatchDecisionStatus } from './types';

/** GET /ai-candidate-matching?jobId=&projectId= — ranked AI candidate matches (21.03). */
export function useAiCandidateMatching(params: { jobId?: string | null; projectId?: string | null }) {
  return useQuery({
    queryKey: ['recruiter-pro', 'ai-matching', params],
    queryFn: async () => {
      const { data } = await api.get<{ data: AiCandidateMatch[] }>('/ai-candidate-matching', {
        params: { jobId: params.jobId || undefined, projectId: params.projectId || undefined },
      });
      return data.data;
    },
    enabled: Boolean(params.jobId || params.projectId),
  });
}

/** PATCH /ai-candidate-matching/:id/override — required human decide control (21.03). */
export function useOverrideAiMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, decision_status }: { id: string; decision_status: MatchDecisionStatus }) => {
      const { data } = await api.patch<{ data: AiCandidateMatch }>(`/ai-candidate-matching/${id}/override`, { decision_status });
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recruiter-pro', 'ai-matching'] }),
  });
}
