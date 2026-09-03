'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { BusinessMember } from './types';

export type BusinessMembersFilter = { role?: string; status?: string; q?: string };

/** GET /business-members — powers the Members list (19.05). */
export function useBusinessMembers(filter: BusinessMembersFilter = {}) {
  return useQuery({
    queryKey: ['business', 'members', 'list', filter],
    queryFn: async () => {
      const { data } = await api.get<{ data: BusinessMember[]; meta: { total: number } }>('/business-members', { params: filter });
      return data;
    },
  });
}

export function useInviteBusinessMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { email: string; role: string }) => {
      const { data } = await api.post<{ data: BusinessMember }>('/business-members', body);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['business', 'members'] }),
  });
}

export function useUpdateBusinessMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; role?: string; status?: string }) => {
      const { data } = await api.patch<{ data: BusinessMember }>(`/business-members/${id}`, body);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['business', 'members'] }),
  });
}

export function useRemoveBusinessMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/business-members/${id}`);
      return id;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['business', 'members'] }),
  });
}
