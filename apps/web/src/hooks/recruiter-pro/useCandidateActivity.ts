'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CandidateActivityEvent } from './types';

/** GET /candidate-activity?candidateId= — unified event ledger for one candidate (21.10). */
export function useCandidateActivity(candidateId: string | null) {
  return useQuery({
    queryKey: ['recruiter-pro', 'candidate-activity', candidateId],
    queryFn: async () => {
      const { data } = await api.get<{ data: CandidateActivityEvent[] }>('/candidate-activity', { params: { candidateId } });
      return data.data;
    },
    enabled: Boolean(candidateId),
  });
}
