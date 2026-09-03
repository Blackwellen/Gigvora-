'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { TalentPool, TalentPoolDetail, TalentPoolInput, TalentPoolMemberInput, TalentPoolStatus, TalentPoolType } from './types';

export type TalentPoolsFilter = { status?: TalentPoolStatus; pool_type?: TalentPoolType };

/** GET /talent-pools — business-owned candidate pools for Talent Pools (19.10). */
export function useTalentPools(filter: TalentPoolsFilter = {}) {
  return useQuery({
    queryKey: ['talent-pools', 'list', filter],
    queryFn: async () => {
      const { data } = await api.get<{ data: TalentPool[]; meta: { total: number } }>('/talent-pools', { params: filter });
      return data;
    },
  });
}

export function useTalentPool(id: string | undefined) {
  return useQuery({
    queryKey: ['talent-pools', 'detail', id],
    queryFn: async () => {
      const { data } = await api.get<{ data: TalentPoolDetail }>(`/talent-pools/${id}`);
      return data.data;
    },
    enabled: Boolean(id),
    retry: 1,
  });
}

export function useCreateTalentPool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: TalentPoolInput) => {
      const { data } = await api.post<{ data: TalentPool }>('/talent-pools', body);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['talent-pools', 'list'] }),
  });
}

export function useUpdateTalentPool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<TalentPoolInput> & { id: string }) => {
      const { data } = await api.patch<{ data: TalentPool }>(`/talent-pools/${id}`, body);
      return data.data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['talent-pools', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['talent-pools', 'detail', vars.id] });
    },
  });
}

export function useDeleteTalentPool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/talent-pools/${id}`);
      return id;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['talent-pools', 'list'] }),
  });
}

export function useAddTalentPoolMember(poolId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: TalentPoolMemberInput) => {
      const { data } = await api.post(`/talent-pools/${poolId}/members`, body);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['talent-pools', 'detail', poolId] });
      queryClient.invalidateQueries({ queryKey: ['talent-pools', 'list'] });
    },
  });
}

export function useRemoveTalentPoolMember(poolId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (memberId: string) => {
      await api.delete(`/talent-pools/${poolId}/members/${memberId}`);
      return memberId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['talent-pools', 'detail', poolId] });
      queryClient.invalidateQueries({ queryKey: ['talent-pools', 'list'] });
    },
  });
}
