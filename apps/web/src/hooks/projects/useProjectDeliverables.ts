'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PmDeliverable, PmDeliverableStatus } from './types';

export function useProjectDeliverables(projectId: string | undefined) {
  return useQuery({
    queryKey: ['pm-projects', projectId, 'deliverables'],
    queryFn: async () => {
      const { data } = await api.get<{ data: PmDeliverable[] }>(`/pm-projects/${projectId}/deliverables`);
      return data.data;
    },
    enabled: Boolean(projectId),
  });
}

export function useCreateDeliverable(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; description?: string; milestoneId?: string; dueDate?: string }) => {
      const { data } = await api.post<{ data: PmDeliverable }>(`/pm-projects/${projectId}/deliverables`, input);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pm-projects', projectId, 'deliverables'] }),
  });
}

export function useUpdateDeliverable(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ deliverableId, patch }: { deliverableId: string; patch: Partial<PmDeliverable> & { status?: PmDeliverableStatus } }) => {
      const { data } = await api.patch<{ data: PmDeliverable }>(`/pm-projects/${projectId}/deliverables/${deliverableId}`, patch);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pm-projects', projectId, 'deliverables'] }),
  });
}
