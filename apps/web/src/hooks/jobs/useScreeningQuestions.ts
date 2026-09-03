'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ScreeningQuestion } from './types';

/** Used by the apply wizard (16.10) to render the job's screening questions, if any exist. */
export function useScreeningQuestions(jobId: string | undefined) {
  return useQuery({
    queryKey: ['screening', 'questions', jobId],
    queryFn: async () => {
      const { data } = await api.get<{ data: ScreeningQuestion[] }>(`/screening/jobs/${jobId}/questions`);
      return data.data;
    },
    enabled: Boolean(jobId),
    retry: 1,
  });
}
