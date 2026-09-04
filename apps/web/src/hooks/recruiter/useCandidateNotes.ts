'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CandidateNote } from './types';

/** GET /candidate-notes?candidateId= — Candidate Notes (20.07). */
export function useCandidateNotes(candidateId: string | undefined) {
  return useQuery({
    queryKey: ['recruiter', 'candidate-notes', candidateId],
    queryFn: async () => {
      const { data } = await api.get<{ data: CandidateNote[]; meta: { total: number } }>('/candidate-notes', { params: { candidateId } });
      return data;
    },
    enabled: Boolean(candidateId),
  });
}

function invalidateNotes(queryClient: ReturnType<typeof useQueryClient>, candidateId?: string) {
  queryClient.invalidateQueries({ queryKey: ['recruiter', 'candidate-notes', candidateId] });
  queryClient.invalidateQueries({ queryKey: ['recruiter', 'candidate-detail', candidateId] });
  queryClient.invalidateQueries({ queryKey: ['recruiter', 'home'] });
}

export function useCreateCandidateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { candidate_id: string; body: string; is_pinned?: boolean }) => {
      const { data } = await api.post<{ data: CandidateNote }>('/candidate-notes', body);
      return data.data;
    },
    onSuccess: (row) => invalidateNotes(queryClient, row.candidate_id),
  });
}

export function useUpdateCandidateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; body?: string; is_pinned?: boolean }) => {
      const { data } = await api.patch<{ data: CandidateNote }>(`/candidate-notes/${id}`, body);
      return data.data;
    },
    onSuccess: (row) => invalidateNotes(queryClient, row.candidate_id),
  });
}

export function useRemoveCandidateNote(candidateId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/candidate-notes/${id}`);
      return id;
    },
    onSuccess: () => invalidateNotes(queryClient, candidateId),
  });
}
