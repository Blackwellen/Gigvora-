'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { RecruiterTalentPool } from './types';

function invalidatePools(queryClient: ReturnType<typeof useQueryClient>, id?: string) {
  queryClient.invalidateQueries({ queryKey: ['recruiter', 'talent-pools'] });
  if (id) queryClient.invalidateQueries({ queryKey: ['recruiter', 'talent-pools', 'detail', id] });
}

/** GET /recruiter-talent-pools — Talent Pools (20.04). */
export function useRecruiterTalentPools(status?: 'active' | 'archived') {
  return useQuery({
    queryKey: ['recruiter', 'talent-pools', { status }],
    queryFn: async () => {
      const { data } = await api.get<{ data: RecruiterTalentPool[]; meta: { total: number } }>('/recruiter-talent-pools', { params: { status } });
      return data;
    },
  });
}

export function useRecruiterTalentPool(id: string | undefined) {
  return useQuery({
    queryKey: ['recruiter', 'talent-pools', 'detail', id],
    queryFn: async () => {
      const { data } = await api.get<{ data: RecruiterTalentPool }>(`/recruiter-talent-pools/${id}`);
      return data.data;
    },
    enabled: Boolean(id),
  });
}

export function useCreateTalentPool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string; description?: string; tags?: string[] }) => {
      const { data } = await api.post<{ data: RecruiterTalentPool }>('/recruiter-talent-pools', body);
      return data.data;
    },
    onSuccess: () => invalidatePools(queryClient),
  });
}

export function useUpdateTalentPool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; name?: string; description?: string; status?: 'active' | 'archived'; tags?: string[] }) => {
      const { data } = await api.patch<{ data: RecruiterTalentPool }>(`/recruiter-talent-pools/${id}`, body);
      return data.data;
    },
    onSuccess: (row) => invalidatePools(queryClient, row.id),
  });
}

export function useRemoveTalentPool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/recruiter-talent-pools/${id}`);
      return id;
    },
    onSuccess: () => invalidatePools(queryClient),
  });
}

export function useAddTalentPoolMember(poolId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { candidate_id?: string; candidate_name?: string; candidate_email?: string; match_score?: number; notes?: string }) => {
      const { data } = await api.post(`/recruiter-talent-pools/${poolId}/members`, body);
      return data.data;
    },
    onSuccess: () => invalidatePools(queryClient, poolId),
  });
}

export function useRemoveTalentPoolMember(poolId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (memberId: string) => {
      await api.delete(`/recruiter-talent-pools/${poolId}/members/${memberId}`);
      return memberId;
    },
    onSuccess: () => invalidatePools(queryClient, poolId),
  });
}
