'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CrmAccount, CrmAccountContactRole, CrmAccountContactRoleInput, CrmAccountInput, CrmAccountRelated, CrmAccountsFilter, CrmBuyingGroupMember, CrmPaginated } from './types';

/** GET /crm/accounts — Accounts collection (24.05). */
export function useCrmAccounts(filter: CrmAccountsFilter = {}) {
  return useQuery({
    queryKey: ['crm-accounts', 'list', filter],
    queryFn: async () => {
      const { data } = await api.get<CrmPaginated<CrmAccount>>('/crm/accounts', { params: filter });
      return data;
    },
  });
}

/** GET /crm/accounts/:id */
export function useCrmAccount(id: string | undefined) {
  return useQuery({
    queryKey: ['crm-accounts', 'detail', id],
    queryFn: async () => {
      const { data } = await api.get<{ data: CrmAccount }>(`/crm/accounts/${id}`);
      return data.data;
    },
    enabled: Boolean(id),
    retry: 1,
  });
}

/** GET /crm/accounts/:id/related — contacts, open opportunities, and recent activity for Account Detail. */
export function useCrmAccountRelated(id: string | undefined) {
  return useQuery({
    queryKey: ['crm-accounts', 'related', id],
    queryFn: async () => {
      const { data } = await api.get<{ data: CrmAccountRelated }>(`/crm/accounts/${id}/related`);
      return data.data;
    },
    enabled: Boolean(id),
  });
}

/** GET /crm/accounts/:id/buying-group — buying-group roles joined with contact identity fields. */
export function useCrmAccountBuyingGroup(id: string | undefined) {
  return useQuery({
    queryKey: ['crm-accounts', 'buying-group', id],
    queryFn: async () => {
      const { data } = await api.get<{ data: CrmBuyingGroupMember[] }>(`/crm/accounts/${id}/buying-group`);
      return data.data;
    },
    enabled: Boolean(id),
  });
}

export function useCreateCrmAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CrmAccountInput) => {
      const { data } = await api.post<{ data: CrmAccount }>('/crm/accounts', body);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crm-accounts', 'list'] }),
  });
}

export function useUpdateCrmAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: CrmAccountInput & { id: string }) => {
      const { data } = await api.patch<{ data: CrmAccount }>(`/crm/accounts/${id}`, body);
      return data.data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['crm-accounts', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['crm-accounts', 'detail', vars.id] });
      queryClient.invalidateQueries({ queryKey: ['crm-accounts', 'related', vars.id] });
    },
  });
}

/** DELETE /crm/accounts/:id — soft-archive (sets archived_at), matching the backend's remove(). */
export function useDeleteCrmAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete<{ data: CrmAccount }>(`/crm/accounts/${id}`);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crm-accounts', 'list'] }),
  });
}

// ---- Buying-group roles (24.30) — nested under /crm/accounts/:accountId/roles ----

export function useCreateCrmAccountContactRole(accountId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CrmAccountContactRoleInput & { contactId: string }) => {
      const { data } = await api.post<{ data: CrmAccountContactRole }>(`/crm/accounts/${accountId}/roles`, body);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-accounts', 'buying-group', accountId] });
      queryClient.invalidateQueries({ queryKey: ['crm-accounts', 'related', accountId] });
    },
  });
}

export function useUpdateCrmAccountContactRole(accountId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ roleId, ...body }: CrmAccountContactRoleInput & { roleId: string }) => {
      const { data } = await api.patch<{ data: CrmAccountContactRole }>(`/crm/accounts/${accountId}/roles/${roleId}`, body);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crm-accounts', 'buying-group', accountId] }),
  });
}

export function useDeleteCrmAccountContactRole(accountId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (roleId: string) => {
      await api.delete(`/crm/accounts/${accountId}/roles/${roleId}`);
      return roleId;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crm-accounts', 'buying-group', accountId] }),
  });
}
