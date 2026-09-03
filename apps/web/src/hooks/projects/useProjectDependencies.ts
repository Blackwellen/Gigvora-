'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PmTaskDependency } from './types';

export function useProjectDependencies(projectId: string | undefined) {
  return useQuery({
    queryKey: ['pm-projects', projectId, 'dependencies'],
    queryFn: async () => {
      const { data } = await api.get<{ data: PmTaskDependency[] }>(`/pm-projects/${projectId}/dependencies`);
      return data.data;
    },
    enabled: Boolean(projectId),
  });
}

export function useCreateDependency(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { taskId: string; dependsOnTaskId: string; dependencyType?: string }) => api.post(`/pm-projects/${projectId}/dependencies`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pm-projects', projectId, 'dependencies'] }),
  });
}

export function useDeleteDependency(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dependencyId: string) => api.delete(`/pm-projects/${projectId}/dependencies/${dependencyId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pm-projects', projectId, 'dependencies'] }),
  });
}
