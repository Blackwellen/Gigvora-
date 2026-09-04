'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  CrmOpportunity,
  CrmOpportunityCloseInput,
  CrmOpportunityDetail,
  CrmOpportunityInput,
  CrmOpportunityMoveInput,
  CrmOpportunitiesFilter,
  CrmPaginated,
} from './types';

/** GET /crm/opportunities — Opportunities collection (24.28), also the source list for the Pipeline board. */
export function useCrmOpportunities(filter: CrmOpportunitiesFilter = {}) {
  return useQuery({
    queryKey: ['crm-opportunities', 'list', filter],
    queryFn: async () => {
      const { data } = await api.get<CrmPaginated<CrmOpportunity>>('/crm/opportunities', { params: filter });
      return data;
    },
  });
}

/** GET /crm/opportunities/:id — enriched with the joined stakeholder contact objects. */
export function useCrmOpportunity(id: string | undefined) {
  return useQuery({
    queryKey: ['crm-opportunities', 'detail', id],
    queryFn: async () => {
      const { data } = await api.get<{ data: CrmOpportunityDetail }>(`/crm/opportunities/${id}`);
      return data.data;
    },
    enabled: Boolean(id),
    retry: 1,
  });
}

export function useCreateCrmOpportunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CrmOpportunityInput) => {
      const { data } = await api.post<{ data: CrmOpportunity }>('/crm/opportunities', body);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crm-opportunities', 'list'] }),
  });
}

export function useUpdateCrmOpportunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: CrmOpportunityInput & { id: string }) => {
      const { data } = await api.patch<{ data: CrmOpportunity }>(`/crm/opportunities/${id}`, body);
      return data.data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['crm-opportunities', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['crm-opportunities', 'detail', vars.id] });
    },
  });
}

/** DELETE /crm/opportunities/:id — hard delete. Returns 204. */
export function useDeleteCrmOpportunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/crm/opportunities/${id}`);
      return id;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crm-opportunities', 'list'] }),
  });
}

/**
 * PATCH /crm/opportunities/:id/move — stage/board-order change, used by
 * PipelineBoard's drag/drop drop handler. Logs a stage_change activity and
 * an opportunity_stage_history row server-side.
 */
export function useMoveCrmOpportunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: CrmOpportunityMoveInput & { id: string }) => {
      const { data } = await api.patch<{ data: CrmOpportunity }>(`/crm/opportunities/${id}/move`, body);
      return data.data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['crm-opportunities', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['crm-opportunities', 'detail', vars.id] });
    },
  });
}

/** POST /crm/opportunities/:id/close — outcome must be 'won' | 'lost'. */
export function useCloseCrmOpportunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: CrmOpportunityCloseInput & { id: string }) => {
      const { data } = await api.post<{ data: CrmOpportunity }>(`/crm/opportunities/${id}/close`, body);
      return data.data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['crm-opportunities', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['crm-opportunities', 'detail', vars.id] });
      queryClient.invalidateQueries({ queryKey: ['crm-analytics'] });
    },
  });
}
