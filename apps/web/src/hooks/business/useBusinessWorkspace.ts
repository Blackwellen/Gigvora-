'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { BusinessRole, BusinessWorkspace } from './types';

/** GET /business-workspace — org profile summary powering Business Home (19.01) and Organisation (19.03). */
export function useBusinessWorkspace() {
  return useQuery({
    queryKey: ['business', 'workspace'],
    queryFn: async () => {
      const { data } = await api.get<{ data: BusinessWorkspace }>('/business-workspace');
      return data.data;
    },
  });
}

export type BusinessWorkspaceUpdate = Partial<
  Pick<BusinessWorkspace, 'name' | 'description' | 'logo_url' | 'website' | 'industry' | 'size'>
>;

export function useUpdateBusinessWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: BusinessWorkspaceUpdate) => {
      const { data } = await api.patch<{ data: BusinessWorkspace }>('/business-workspace', body);
      return data.data;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['business', 'workspace'], updated);
    },
  });
}

/** GET /business-workspace/roles — roles & permissions table on Organisation (19.03). */
export function useBusinessRoles() {
  return useQuery({
    queryKey: ['business', 'roles'],
    queryFn: async () => {
      const { data } = await api.get<{ data: BusinessRole[] }>('/business-workspace/roles');
      return data.data;
    },
  });
}

export type BusinessRoleInput = { name: string; description?: string; permissions: string[] };

export function useCreateBusinessRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: BusinessRoleInput) => {
      const { data } = await api.post<{ data: BusinessRole }>('/business-workspace/roles', body);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['business', 'roles'] }),
  });
}

export function useUpdateBusinessRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<BusinessRoleInput> & { id: string }) => {
      const { data } = await api.patch<{ data: BusinessRole }>(`/business-workspace/roles/${id}`, body);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['business', 'roles'] }),
  });
}

export function useDeleteBusinessRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/business-workspace/roles/${id}`);
      return id;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['business', 'roles'] }),
  });
}
