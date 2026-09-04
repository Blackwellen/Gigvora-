'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CandidateSearchResult } from './types';

export type CandidateSearchFilter = { q?: string; skills?: string; location?: string; open_to_work?: boolean };

/** GET /candidate-search — basic keyword/skills/location search (20.02). No boolean/NL search — that's Recruiter Pro. */
export function useCandidateSearch(filter: CandidateSearchFilter = {}) {
  return useQuery({
    queryKey: ['recruiter', 'candidate-search', filter],
    queryFn: async () => {
      const { data } = await api.get<{ data: CandidateSearchResult[]; meta: { total: number } }>('/candidate-search', { params: filter });
      return data;
    },
  });
}
