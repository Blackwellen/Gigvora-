'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PmProject, PmProjectType } from './types';

export type ProjectsFilter = {
  status?: string;
  search?: string;
  sort?: 'updated_desc' | 'name_asc' | 'due_asc';
  page?: number;
  pageSize?: number;
};

export function useProjects(filter: ProjectsFilter = {}) {
  return useQuery({
    queryKey: ['pm-projects', 'list', filter],
    queryFn: async () => {
      const { data } = await api.get<{ data: PmProject[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } }>('/pm-projects', {
        params: filter,
      });
      return data;
    },
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; description?: string; projectType?: PmProjectType; clientName?: string; startDate?: string; targetEndDate?: string }) => {
      const { data } = await api.post<{ data: PmProject }>('/pm-projects', input);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pm-projects', 'list'] }),
  });
}
