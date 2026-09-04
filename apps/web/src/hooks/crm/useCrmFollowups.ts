'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CrmFollowup, CrmFollowupInput, CrmFollowupSnoozeInput, CrmFollowupsFilter, CrmPaginated } from './types';

/** GET /crm/followups — Follow-Ups collection (24.21), also used for CRM Home's "upcoming follow-ups" list. */
export function useCrmFollowups(filter: CrmFollowupsFilter = {}) {
  return useQuery({
    queryKey: ['crm-followups', 'list', filter],
    queryFn: async () => {
      const { data } = await api.get<CrmPaginated<CrmFollowup>>('/crm/followups', { params: filter });
      return data;
    },
  });
}

/** GET /crm/followups/:id */
export function useCrmFollowup(id: string | undefined) {
  return useQuery({
    queryKey: ['crm-followups', 'detail', id],
    queryFn: async () => {
      const { data } = await api.get<{ data: CrmFollowup }>(`/crm/followups/${id}`);
      return data.data;
    },
    enabled: Boolean(id),
  });
}

export function useCreateCrmFollowup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CrmFollowupInput) => {
      const { data } = await api.post<{ data: CrmFollowup }>('/crm/followups', body);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crm-followups', 'list'] }),
  });
}

export function useUpdateCrmFollowup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: CrmFollowupInput & { id: string }) => {
      const { data } = await api.patch<{ data: CrmFollowup }>(`/crm/followups/${id}`, body);
      return data.data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['crm-followups', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['crm-followups', 'detail', vars.id] });
    },
  });
}

/** DELETE /crm/followups/:id — hard delete. Returns 204. */
export function useDeleteCrmFollowup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/crm/followups/${id}`);
      return id;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crm-followups', 'list'] }),
  });
}

/** PATCH /crm/followups/:id/complete */
export function useCompleteCrmFollowup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch<{ data: CrmFollowup }>(`/crm/followups/${id}/complete`);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crm-followups', 'list'] }),
  });
}

/** PATCH /crm/followups/:id/snooze — body: { untilAt } */
export function useSnoozeCrmFollowup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: CrmFollowupSnoozeInput & { id: string }) => {
      const { data } = await api.patch<{ data: CrmFollowup }>(`/crm/followups/${id}/snooze`, body);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crm-followups', 'list'] }),
  });
}
