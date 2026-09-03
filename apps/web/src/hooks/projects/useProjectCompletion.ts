'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PmCompletionChecklist } from './types';

export function useProjectCompletionChecklist(projectId: string | undefined) {
  return useQuery({
    queryKey: ['pm-projects', projectId, 'completion'],
    queryFn: async () => {
      const { data } = await api.get<{ data: PmCompletionChecklist }>(`/pm-projects/${projectId}/completion/checklist`);
      return data.data;
    },
    enabled: Boolean(projectId),
  });
}

export function useCompleteProject(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => api.post(`/pm-projects/${projectId}/completion/complete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-projects', projectId, 'completion'] });
      queryClient.invalidateQueries({ queryKey: ['pm-projects', 'detail', projectId] });
    },
  });
}
