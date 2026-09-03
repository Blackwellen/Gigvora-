'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { BusinessProject, BusinessProjectDetail, BusinessProjectStatus } from './types';

export type BusinessProjectsFilter = { status?: BusinessProjectStatus };

/** GET /business-projects — company-wide internal PM project portfolio (19.14). */
export function useBusinessProjects(filter: BusinessProjectsFilter = {}) {
  return useQuery({
    queryKey: ['business-projects', 'list', filter],
    queryFn: async () => {
      const { data } = await api.get<{ data: BusinessProject[]; meta: { total: number } }>('/business-projects', { params: filter });
      return data;
    },
  });
}

export function useBusinessProject(id: string | undefined) {
  return useQuery({
    queryKey: ['business-projects', 'detail', id],
    queryFn: async () => {
      const { data } = await api.get<{ data: BusinessProjectDetail }>(`/business-projects/${id}`);
      return data.data;
    },
    enabled: Boolean(id),
    retry: 1,
  });
}
