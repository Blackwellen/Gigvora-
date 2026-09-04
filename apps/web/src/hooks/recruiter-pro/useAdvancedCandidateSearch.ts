'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { AdvancedSearchResult, BooleanClauseGroup, SavedQueryGroup } from './types';

/** POST /advanced-candidate-search/query — boolean/semantic candidate search (21.02). */
export function useRunAdvancedSearch() {
  return useMutation({
    mutationFn: async (body: { groups: BooleanClauseGroup[]; semantic_expansion: boolean }) => {
      const { data } = await api.post<{ data: AdvancedSearchResult[]; meta: { total: number } }>('/advanced-candidate-search/query', body);
      return data;
    },
  });
}

/** GET /advanced-candidate-search/saved-queries — saved boolean query groups (21.02). */
export function useSavedQueries() {
  return useQuery({
    queryKey: ['recruiter-pro', 'saved-queries'],
    queryFn: async () => {
      const { data } = await api.get<{ data: SavedQueryGroup[] }>('/advanced-candidate-search/saved-queries');
      return data.data;
    },
  });
}

export function useCreateSavedQuery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string; groups: BooleanClauseGroup[]; semantic_expansion: boolean }) => {
      const { data } = await api.post<{ data: SavedQueryGroup }>('/advanced-candidate-search/saved-queries', body);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recruiter-pro', 'saved-queries'] }),
  });
}

export function useDeleteSavedQuery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/advanced-candidate-search/saved-queries/${id}`);
      return id;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recruiter-pro', 'saved-queries'] }),
  });
}
