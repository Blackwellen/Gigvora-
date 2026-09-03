'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PmMilestone, PmMilestoneStatus } from './types';

export function useProjectMilestones(projectId: string | undefined) {
  return useQuery({
    queryKey: ['pm-projects', projectId, 'milestones'],
    queryFn: async () => {
      const { data } = await api.get<{ data: PmMilestone[] }>(`/pm-projects/${projectId}/milestones`);
      return data.data;
    },
    enabled: Boolean(projectId),
  });
}

export function useCreateMilestone(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; description?: string; targetDate?: string; amount?: number }) => {
      const { data } = await api.post<{ data: PmMilestone }>(`/pm-projects/${projectId}/milestones`, input);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pm-projects', projectId, 'milestones'] }),
  });
}

export function useUpdateMilestone(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ milestoneId, patch }: { milestoneId: string; patch: Partial<PmMilestone> & { status?: PmMilestoneStatus } }) => {
      const { data } = await api.patch<{ data: PmMilestone }>(`/pm-projects/${projectId}/milestones/${milestoneId}`, patch);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pm-projects', projectId, 'milestones'] }),
  });
}
