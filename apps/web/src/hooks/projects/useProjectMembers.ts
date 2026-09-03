'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PmProjectMember } from './types';

export function useProjectMembers(projectId: string | undefined) {
  return useQuery({
    queryKey: ['pm-projects', projectId, 'members'],
    queryFn: async () => {
      const { data } = await api.get<{ data: PmProjectMember[] }>(`/pm-projects/${projectId}/members`);
      return data.data;
    },
    enabled: Boolean(projectId),
  });
}
