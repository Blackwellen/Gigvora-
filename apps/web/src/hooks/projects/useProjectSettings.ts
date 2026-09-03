'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export function useArchiveProject(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => api.post(`/pm-projects/${projectId}/settings/archive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-projects', 'detail', projectId] });
      queryClient.invalidateQueries({ queryKey: ['pm-projects', 'list'] });
    },
  });
}

export function useTransferOwnership(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newOwnerMemberId: string) => api.post(`/pm-projects/${projectId}/settings/transfer-ownership`, { newOwnerMemberId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-projects', 'detail', projectId] });
      queryClient.invalidateQueries({ queryKey: ['pm-projects', projectId, 'members'] });
    },
  });
}

export function useDeleteProjectAndRedirect(projectId: string | undefined) {
  const router = useRouter();
  return useMutation({
    mutationFn: async () => api.delete(`/pm-projects/${projectId}`),
    onSuccess: () => router.push('/app/projects-home'),
  });
}
