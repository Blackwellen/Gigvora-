'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { OutreachChannel, OutreachTemplate } from './types';

function invalidate(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['recruiter-pro', 'outreach-templates'] });
}

/** GET /outreach-templates?channel= — template library (21.07). */
export function useOutreachTemplates(channel?: OutreachChannel | 'all') {
  return useQuery({
    queryKey: ['recruiter-pro', 'outreach-templates', channel],
    queryFn: async () => {
      const { data } = await api.get<{ data: OutreachTemplate[] }>('/outreach-templates', {
        params: { channel: channel && channel !== 'all' ? channel : undefined },
      });
      return data.data;
    },
  });
}

export function useCreateOutreachTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string; channel: OutreachChannel; subject?: string; body: string }) => {
      const { data } = await api.post<{ data: OutreachTemplate }>('/outreach-templates', body);
      return data.data;
    },
    onSuccess: () => invalidate(queryClient),
  });
}

export function useUpdateOutreachTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; name?: string; channel?: OutreachChannel; subject?: string; body?: string }) => {
      const { data } = await api.patch<{ data: OutreachTemplate }>(`/outreach-templates/${id}`, body);
      return data.data;
    },
    onSuccess: () => invalidate(queryClient),
  });
}

export function useDeleteOutreachTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/outreach-templates/${id}`);
      return id;
    },
    onSuccess: () => invalidate(queryClient),
  });
}
