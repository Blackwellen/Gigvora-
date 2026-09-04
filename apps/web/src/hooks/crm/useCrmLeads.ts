'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CrmLead, CrmLeadConvertInput, CrmLeadConvertResult, CrmLeadDisqualifyInput, CrmLeadInput, CrmLeadsFilter, CrmPaginated } from './types';

/** GET /crm/leads — Leads collection (24.03). */
export function useCrmLeads(filter: CrmLeadsFilter = {}) {
  return useQuery({
    queryKey: ['crm-leads', 'list', filter],
    queryFn: async () => {
      const { data } = await api.get<CrmPaginated<CrmLead>>('/crm/leads', { params: filter });
      return data;
    },
  });
}

/** GET /crm/leads/:id */
export function useCrmLead(id: string | undefined) {
  return useQuery({
    queryKey: ['crm-leads', 'detail', id],
    queryFn: async () => {
      const { data } = await api.get<{ data: CrmLead }>(`/crm/leads/${id}`);
      return data.data;
    },
    enabled: Boolean(id),
    retry: 1,
  });
}

export function useCreateCrmLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CrmLeadInput) => {
      const { data } = await api.post<{ data: CrmLead }>('/crm/leads', body);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crm-leads', 'list'] }),
  });
}

export function useUpdateCrmLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: CrmLeadInput & { id: string }) => {
      const { data } = await api.patch<{ data: CrmLead }>(`/crm/leads/${id}`, body);
      return data.data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['crm-leads', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['crm-leads', 'detail', vars.id] });
    },
  });
}

/** DELETE /crm/leads/:id — hard delete (leads have no archived_at column). Returns 204. */
export function useDeleteCrmLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/crm/leads/${id}`);
      return id;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crm-leads', 'list'] }),
  });
}

/**
 * POST /crm/leads/:id/convert — finds-or-creates the account/contact and
 * optionally an opportunity, marks the lead converted. Invalidates leads,
 * contacts, accounts, and opportunities lists since all four can change.
 */
export function useConvertCrmLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: CrmLeadConvertInput & { id: string }) => {
      const { data } = await api.post<{ data: CrmLeadConvertResult }>(`/crm/leads/${id}/convert`, body);
      return data.data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['crm-leads', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['crm-leads', 'detail', vars.id] });
      queryClient.invalidateQueries({ queryKey: ['crm-contacts', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['crm-accounts', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['crm-opportunities', 'list'] });
    },
  });
}

export function useDisqualifyCrmLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: CrmLeadDisqualifyInput & { id: string }) => {
      const { data } = await api.post<{ data: CrmLead }>(`/crm/leads/${id}/disqualify`, body);
      return data.data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['crm-leads', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['crm-leads', 'detail', vars.id] });
    },
  });
}
