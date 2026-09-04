'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CandidateDetail } from './types';

/** GET /candidate-detail/:candidateId — recruiter-facing read view over Professional Profile data + recruiter overlay (20.06). */
export function useCandidateDetail(candidateId: string | undefined, opts: { skills?: string } = {}) {
  return useQuery({
    queryKey: ['recruiter', 'candidate-detail', candidateId, opts.skills],
    queryFn: async () => {
      const { data } = await api.get<{ data: CandidateDetail }>(`/candidate-detail/${candidateId}`, { params: { skills: opts.skills } });
      return data.data;
    },
    enabled: Boolean(candidateId),
    retry: 1,
  });
}
