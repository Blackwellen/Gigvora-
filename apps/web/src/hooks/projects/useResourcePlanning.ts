'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PmResourcePlanningRow } from './types';

export function useResourcePlanning(projectId: string | undefined) {
  return useQuery({
    queryKey: ['pm-projects', projectId, 'resource-planning'],
    queryFn: async () => {
      const { data } = await api.get<{ data: { members: PmResourcePlanningRow[]; unassignedOpenTaskCount: number } }>(`/pm-projects/${projectId}/resource-planning`);
      return data.data;
    },
    enabled: Boolean(projectId),
  });
}
