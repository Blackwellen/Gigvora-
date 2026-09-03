'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { TalentCandidate, TalentCandidateDetail } from './types';

export type TalentDiscoveryFilter = { q?: string; skills?: string; location?: string; open_to_work?: boolean };

/** GET /talent-discovery — candidate search workflow for Talent Discovery (19.08). */
export function useTalentDiscovery(filter: TalentDiscoveryFilter = {}) {
  return useQuery({
    queryKey: ['talent-discovery', 'list', filter],
    queryFn: async () => {
      const { data } = await api.get<{ data: TalentCandidate[]; meta: { total: number } }>('/talent-discovery', { params: filter });
      return data;
    },
  });
}

export function useTalentDiscoveryCandidate(userId: string | undefined) {
  return useQuery({
    queryKey: ['talent-discovery', 'detail', userId],
    queryFn: async () => {
      const { data } = await api.get<{ data: TalentCandidateDetail }>(`/talent-discovery/${userId}`);
      return data.data;
    },
    enabled: Boolean(userId),
    retry: 1,
  });
}
