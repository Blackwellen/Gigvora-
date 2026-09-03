'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Job, JobInput, ScreeningQuestionInput } from './types';

export function useCreateJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: JobInput) => {
      const { data } = await api.post<{ data: Job }>('/jobs', input);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['jobs', 'list'] }),
  });
}

/** Screening questions are keyed off a real job id, so the wizard collects drafts locally and
 * fires these one at a time right after the job is created (see create-job/new/page.tsx step 10). */
export function useAddScreeningQuestion() {
  return useMutation({
    mutationFn: async ({ jobId, input }: { jobId: string; input: ScreeningQuestionInput }) => {
      const { data } = await api.post(`/screening/jobs/${jobId}/questions`, input);
      return data.data;
    },
  });
}
