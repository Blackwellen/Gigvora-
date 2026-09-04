'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { RecruiterShortlist } from './types';

function invalidateShortlists(queryClient: ReturnType<typeof useQueryClient>, id?: string) {
  queryClient.invalidateQueries({ queryKey: ['recruiter', 'shortlists'] });
  if (id) queryClient.invalidateQueries({ queryKey: ['recruiter', 'shortlists', 'detail', id] });
}

/** GET /recruiter-shortlists — Shortlists (20.05). */
export function useRecruiterShortlists(status?: 'active' | 'archived') {
  return useQuery({
    queryKey: ['recruiter', 'shortlists', { status }],
    queryFn: async () => {
      const { data } = await api.get<{ data: RecruiterShortlist[]; meta: { total: number } }>('/recruiter-shortlists', { params: { status } });
      return data;
    },
  });
}

export function useRecruiterShortlist(id: string | undefined) {
  return useQuery({
    queryKey: ['recruiter', 'shortlists', 'detail', id],
    queryFn: async () => {
      const { data } = await api.get<{ data: RecruiterShortlist }>(`/recruiter-shortlists/${id}`);
      return data.data;
    },
    enabled: Boolean(id),
  });
}

export function useCreateShortlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string; description?: string; project_id?: string }) => {
      const { data } = await api.post<{ data: RecruiterShortlist }>('/recruiter-shortlists', body);
      return data.data;
    },
    onSuccess: () => invalidateShortlists(queryClient),
  });
}

export function useUpdateShortlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; name?: string; description?: string; status?: 'active' | 'archived'; project_id?: string }) => {
      const { data } = await api.patch<{ data: RecruiterShortlist }>(`/recruiter-shortlists/${id}`, body);
      return data.data;
    },
    onSuccess: (row) => invalidateShortlists(queryClient, row.id),
  });
}

export function useRemoveShortlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/recruiter-shortlists/${id}`);
      return id;
    },
    onSuccess: () => invalidateShortlists(queryClient),
  });
}

export function useAddShortlistMember(shortlistId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { candidate_id?: string; candidate_name?: string; rank?: number; notes?: string }) => {
      const { data } = await api.post(`/recruiter-shortlists/${shortlistId}/members`, body);
      return data.data;
    },
    onSuccess: () => invalidateShortlists(queryClient, shortlistId),
  });
}

export function useUpdateShortlistMember(shortlistId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId, ...body }: { memberId: string; rank?: number; notes?: string }) => {
      const { data } = await api.patch(`/recruiter-shortlists/${shortlistId}/members/${memberId}`, body);
      return data.data;
    },
    onSuccess: () => invalidateShortlists(queryClient, shortlistId),
  });
}

export function useRemoveShortlistMember(shortlistId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (memberId: string) => {
      await api.delete(`/recruiter-shortlists/${shortlistId}/members/${memberId}`);
      return memberId;
    },
    onSuccess: () => invalidateShortlists(queryClient, shortlistId),
  });
}
