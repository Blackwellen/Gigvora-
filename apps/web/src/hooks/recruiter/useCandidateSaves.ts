'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CandidateSave } from './types';

export type CandidateSavesFilter = { status?: CandidateSave['status']; limit?: number; offset?: number };

/** GET /candidate-saves — Saved Candidates (20.03). */
export function useCandidateSaves(filter: CandidateSavesFilter = {}) {
  return useQuery({
    queryKey: ['recruiter', 'candidate-saves', filter],
    queryFn: async () => {
      const { data } = await api.get<{ data: CandidateSave[]; meta: { total: number } }>('/candidate-saves', { params: filter });
      return data;
    },
  });
}

function invalidateSaves(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['recruiter', 'candidate-saves'] });
  queryClient.invalidateQueries({ queryKey: ['recruiter', 'candidate-search'] });
  queryClient.invalidateQueries({ queryKey: ['recruiter', 'candidate-detail'] });
  queryClient.invalidateQueries({ queryKey: ['recruiter', 'home'] });
}

export function useSaveCandidate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { candidate_id: string; note?: string; tags?: string[] }) => {
      const { data } = await api.post<{ data: CandidateSave }>('/candidate-saves', body);
      return data.data;
    },
    onSuccess: () => invalidateSaves(queryClient),
  });
}

export function useUpdateCandidateSave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; note?: string; tags?: string[]; status?: CandidateSave['status'] }) => {
      const { data } = await api.patch<{ data: CandidateSave }>(`/candidate-saves/${id}`, body);
      return data.data;
    },
    onSuccess: () => invalidateSaves(queryClient),
  });
}

export function useRemoveCandidateSave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/candidate-saves/${id}`);
      return id;
    },
    onSuccess: () => invalidateSaves(queryClient),
  });
}
