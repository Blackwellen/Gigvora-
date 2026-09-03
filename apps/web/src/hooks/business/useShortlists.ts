'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Shortlist, ShortlistDetail, ShortlistInput, ShortlistMemberInput, ShortlistStatus } from './types';

export type ShortlistsFilter = { job_id?: string; status?: ShortlistStatus };

/** GET /shortlists — business shortlists for Shortlists (19.11). */
export function useShortlists(filter: ShortlistsFilter = {}) {
  return useQuery({
    queryKey: ['shortlists', 'list', filter],
    queryFn: async () => {
      const { data } = await api.get<{ data: Shortlist[]; meta: { total: number } }>('/shortlists', { params: filter });
      return data;
    },
  });
}

export function useShortlist(id: string | undefined) {
  return useQuery({
    queryKey: ['shortlists', 'detail', id],
    queryFn: async () => {
      const { data } = await api.get<{ data: ShortlistDetail }>(`/shortlists/${id}`);
      return data.data;
    },
    enabled: Boolean(id),
    retry: 1,
  });
}

export function useCreateShortlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: ShortlistInput) => {
      const { data } = await api.post<{ data: Shortlist }>('/shortlists', body);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shortlists', 'list'] }),
  });
}

export function useUpdateShortlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<ShortlistInput> & { id: string }) => {
      const { data } = await api.patch<{ data: Shortlist }>(`/shortlists/${id}`, body);
      return data.data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['shortlists', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['shortlists', 'detail', vars.id] });
    },
  });
}

export function useDeleteShortlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/shortlists/${id}`);
      return id;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shortlists', 'list'] }),
  });
}

export function useAddShortlistMember(shortlistId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: ShortlistMemberInput) => {
      const { data } = await api.post(`/shortlists/${shortlistId}/members`, body);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shortlists', 'detail', shortlistId] });
      queryClient.invalidateQueries({ queryKey: ['shortlists', 'list'] });
    },
  });
}

export function useUpdateShortlistMember(shortlistId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId, ...body }: Partial<ShortlistMemberInput> & { memberId: string }) => {
      const { data } = await api.patch(`/shortlists/${shortlistId}/members/${memberId}`, body);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shortlists', 'detail', shortlistId] }),
  });
}

export function useRemoveShortlistMember(shortlistId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (memberId: string) => {
      await api.delete(`/shortlists/${shortlistId}/members/${memberId}`);
      return memberId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shortlists', 'detail', shortlistId] });
      queryClient.invalidateQueries({ queryKey: ['shortlists', 'list'] });
    },
  });
}
