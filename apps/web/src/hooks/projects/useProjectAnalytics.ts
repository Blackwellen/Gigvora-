'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PmAnalyticsKpis, PmDeliveryRisk } from './types';

export function useProjectKpis(projectId: string | undefined) {
  return useQuery({
    queryKey: ['pm-projects', projectId, 'analytics', 'kpis'],
    queryFn: async () => {
      const { data } = await api.get<{ data: PmAnalyticsKpis }>(`/pm-projects/${projectId}/analytics/kpis`);
      return data.data;
    },
    enabled: Boolean(projectId),
  });
}

export function useDeliveryRisk(projectId: string | undefined) {
  return useQuery({
    queryKey: ['pm-projects', projectId, 'analytics', 'delivery-risk'],
    queryFn: async () => {
      const { data } = await api.get<{ data: PmDeliveryRisk }>(`/pm-projects/${projectId}/analytics/delivery-risk`);
      return data.data;
    },
    enabled: Boolean(projectId),
    retry: false,
  });
}
