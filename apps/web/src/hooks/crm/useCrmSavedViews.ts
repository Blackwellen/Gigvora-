'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CrmPaginated, CrmSavedView, CrmSavedViewInput, CrmSavedViewsFilter } from './types';

/** GET /crm/saved-views — the requesting user's own views plus any team/workspace-visible views (24.32). */
export function useCrmSavedViews(filter: CrmSavedViewsFilter = {}) {
  return useQuery({
    queryKey: ['crm-saved-views', 'list', filter],
    queryFn: async () => {
      const { data } = await api.get<CrmPaginated<CrmSavedView>>('/crm/saved-views', { params: filter });
      return data;
    },
  });
}

/** GET /crm/saved-views/:id */
export function useCrmSavedView(id: string | undefined) {
  return useQuery({
    queryKey: ['crm-saved-views', 'detail', id],
    queryFn: async () => {
      const { data } = await api.get<{ data: CrmSavedView }>(`/crm/saved-views/${id}`);
      return data.data;
    },
    enabled: Boolean(id),
  });
}

export function useCreateCrmSavedView() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CrmSavedViewInput) => {
      const { data } = await api.post<{ data: CrmSavedView }>('/crm/saved-views', body);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crm-saved-views', 'list'] }),
  });
}

export function useUpdateCrmSavedView() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: CrmSavedViewInput & { id: string }) => {
      const { data } = await api.patch<{ data: CrmSavedView }>(`/crm/saved-views/${id}`, body);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crm-saved-views', 'list'] }),
  });
}

/** DELETE /crm/saved-views/:id — hard delete. Returns 204. */
export function useDeleteCrmSavedView() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/crm/saved-views/${id}`);
      return id;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crm-saved-views', 'list'] }),
  });
}

/** POST /crm/saved-views/:id/duplicate — clones as a new private, non-default view named "<name> (copy)". */
export function useDuplicateCrmSavedView() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<{ data: CrmSavedView }>(`/crm/saved-views/${id}/duplicate`);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crm-saved-views', 'list'] }),
  });
}

/** PATCH /crm/saved-views/:id/set-default — unsets any other default view for the same objectType/owner first. */
export function useSetDefaultCrmSavedView() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch<{ data: CrmSavedView }>(`/crm/saved-views/${id}/set-default`);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crm-saved-views', 'list'] }),
  });
}
