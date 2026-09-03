'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ScreeningDecision, ScreeningQuestion, ScreeningQuestionInput, ScreeningQueueItem } from './types';

// Question *listing* lives in useScreeningQuestions.ts (used by both the apply wizard and
// this screening workbench, same queryKey ['screening','questions', jobId]) — this file
// covers the recruiter-side mutations/queries: adding questions, and the review queue.

export function useAddScreeningQuestion(jobId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ScreeningQuestionInput) => {
      const { data } = await api.post<{ data: ScreeningQuestion }>(`/screening/jobs/${jobId}/questions`, input);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['screening', 'questions', jobId] });
    },
  });
}

export function useScreeningQueue(jobId: string | undefined) {
  return useQuery({
    queryKey: ['screening', 'queue', jobId],
    queryFn: async () => {
      const { data } = await api.get<{ data: ScreeningQueueItem[] }>(`/screening/jobs/${jobId}/queue`);
      return data.data;
    },
    enabled: Boolean(jobId),
    retry: 1,
  });
}

export function useReviewScreeningApplication(jobId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ applicationId, decision, notes }: { applicationId: string; decision: ScreeningDecision; notes?: string }) => {
      const { data } = await api.post(`/screening/applications/${applicationId}/review`, { decision, notes });
      return data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['screening', 'queue', jobId] });
      queryClient.invalidateQueries({ queryKey: ['applications', 'detail', variables.applicationId] });
      queryClient.invalidateQueries({ queryKey: ['jobs', 'applicants', jobId] });
    },
  });
}
