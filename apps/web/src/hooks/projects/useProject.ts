'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PmProject } from './types';

export function useProject(projectId: string | undefined) {
  return useQuery({
    queryKey: ['pm-projects', 'detail', projectId],
    queryFn: async () => {
      const { data } = await api.get<{ data: PmProject }>(`/pm-projects/${projectId}`);
      return data.data;
    },
    enabled: Boolean(projectId),
    retry: 1,
  });
}

export function useUpdateProject(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<PmProject>) => {
      const { data } = await api.patch<{ data: PmProject }>(`/pm-projects/${projectId}`, patch);
      return data.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['pm-projects', 'detail', projectId], data);
      queryClient.invalidateQueries({ queryKey: ['pm-projects', 'list'] });
    },
  });
}
