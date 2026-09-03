'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PmProjectFile } from './types';

export function useProjectFiles(projectId: string | undefined) {
  return useQuery({
    queryKey: ['pm-projects', projectId, 'files'],
    queryFn: async () => {
      const { data } = await api.get<{ data: PmProjectFile[] }>(`/pm-projects/${projectId}/files`);
      return data.data;
    },
    enabled: Boolean(projectId),
  });
}

export function useUploadProjectFile(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post<{ data: PmProjectFile }>(`/pm-projects/${projectId}/files`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pm-projects', projectId, 'files'] }),
  });
}

export function useProjectFileDownloadUrl() {
  return useMutation({
    mutationFn: async ({ projectId, fileId }: { projectId: string; fileId: string }) => {
      const { data } = await api.get<{ data: { url: string; expiresInSeconds: number } }>(`/pm-projects/${projectId}/files/${fileId}/download-url`);
      return data.data;
    },
  });
}

export function useDeleteProjectFile(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (fileId: string) => api.delete(`/pm-projects/${projectId}/files/${fileId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pm-projects', projectId, 'files'] }),
  });
}
