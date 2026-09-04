'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CrmContact, CrmContactDuplicateSearchParams, CrmContactInput, CrmContactsFilter, CrmPaginated } from './types';

/** GET /crm/contacts — Contacts collection (24.02). */
export function useCrmContacts(filter: CrmContactsFilter = {}) {
  return useQuery({
    queryKey: ['crm-contacts', 'list', filter],
    queryFn: async () => {
      const { data } = await api.get<CrmPaginated<CrmContact>>('/crm/contacts', { params: filter });
      return data;
    },
  });
}

/** GET /crm/contacts/:id */
export function useCrmContact(id: string | undefined) {
  return useQuery({
    queryKey: ['crm-contacts', 'detail', id],
    queryFn: async () => {
      const { data } = await api.get<{ data: CrmContact }>(`/crm/contacts/${id}`);
      return data.data;
    },
    enabled: Boolean(id),
    retry: 1,
  });
}

/**
 * GET /crm/contacts/dedupe-search — normalized exact-match lookup, used by the
 * create-contact form to warn before creating an obvious duplicate.
 */
export function useCrmContactDuplicateSearch(params: CrmContactDuplicateSearchParams, enabled = true) {
  const hasQuery = Boolean(params.email || params.phone || (params.firstName && params.lastName));
  return useQuery({
    queryKey: ['crm-contacts', 'dedupe-search', params],
    queryFn: async () => {
      const { data } = await api.get<{ data: CrmContact[] }>('/crm/contacts/dedupe-search', { params });
      return data.data;
    },
    enabled: enabled && hasQuery,
  });
}

export function useCreateCrmContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CrmContactInput) => {
      const { data } = await api.post<{ data: CrmContact }>('/crm/contacts', body);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crm-contacts', 'list'] }),
  });
}

export function useUpdateCrmContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: CrmContactInput & { id: string }) => {
      const { data } = await api.patch<{ data: CrmContact }>(`/crm/contacts/${id}`, body);
      return data.data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['crm-contacts', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['crm-contacts', 'detail', vars.id] });
    },
  });
}

/** DELETE /crm/contacts/:id — soft-archive (sets archived_at). */
export function useDeleteCrmContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete<{ data: CrmContact }>(`/crm/contacts/${id}`);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crm-contacts', 'list'] }),
  });
}
