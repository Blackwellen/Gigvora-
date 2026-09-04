'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CrmPaginated, CrmSegment, CrmSegmentInput, CrmSegmentPreviewInput, CrmSegmentPreviewResult, CrmSegmentsFilter } from './types';

/** GET /crm/segments — Segments collection (24.18 / 24.32). */
export function useCrmSegments(filter: CrmSegmentsFilter = {}) {
  return useQuery({
    queryKey: ['crm-segments', 'list', filter],
    queryFn: async () => {
      const { data } = await api.get<CrmPaginated<CrmSegment>>('/crm/segments', { params: filter });
      return data;
    },
  });
}

/** GET /crm/segments/:id — includes the ordered `rules` array. */
export function useCrmSegment(id: string | undefined) {
  return useQuery({
    queryKey: ['crm-segments', 'detail', id],
    queryFn: async () => {
      const { data } = await api.get<{ data: CrmSegment }>(`/crm/segments/${id}`);
      return data.data;
    },
    enabled: Boolean(id),
    retry: 1,
  });
}

export function useCreateCrmSegment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CrmSegmentInput) => {
      const { data } = await api.post<{ data: CrmSegment }>('/crm/segments', body);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crm-segments', 'list'] }),
  });
}

export function useUpdateCrmSegment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: CrmSegmentInput & { id: string }) => {
      const { data } = await api.patch<{ data: CrmSegment }>(`/crm/segments/${id}`, body);
      return data.data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['crm-segments', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['crm-segments', 'detail', vars.id] });
    },
  });
}

/** DELETE /crm/segments/:id — hard delete. Returns 204. */
export function useDeleteCrmSegment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/crm/segments/${id}`);
      return id;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crm-segments', 'list'] }),
  });
}

/**
 * POST /crm/segments/preview — evaluates a candidate ruleset without saving.
 * Not cached as a useQuery (the rule tree changes on every keystroke in
 * SegmentRuleBuilder) — call `.mutateAsync` from a debounced effect instead.
 */
export function usePreviewCrmSegment() {
  return useMutation({
    mutationFn: async (body: CrmSegmentPreviewInput) => {
      const { data } = await api.post<{ data: CrmSegmentPreviewResult }>('/crm/segments/preview', body);
      return data.data;
    },
  });
}

/** POST /crm/segments/:id/recalculate — refreshes member_count_cached for a saved (dynamic) segment. */
export function useRecalculateCrmSegment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<{ data: CrmSegment }>(`/crm/segments/${id}/recalculate`);
      return data.data;
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['crm-segments', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['crm-segments', 'detail', id] });
    },
  });
}
