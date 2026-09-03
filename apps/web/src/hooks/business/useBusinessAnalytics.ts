'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { BusinessOverview, TrendMetric, TrendPoint } from './types';

/** GET /business-analytics/overview — KPI + funnel + top-spend data shared by Business Dashboard (19.02) and Business Analytics (19.16). */
export function useBusinessOverview() {
  return useQuery({
    queryKey: ['business', 'analytics', 'overview'],
    queryFn: async () => {
      const { data } = await api.get<{ data: BusinessOverview }>('/business-analytics/overview');
      return data.data;
    },
  });
}

/** GET /business-analytics/trends?metric=&months= — trend chart panels on Business Analytics (19.16). */
export function useBusinessTrend(metric: TrendMetric, months = 12) {
  return useQuery({
    queryKey: ['business', 'analytics', 'trends', metric, months],
    queryFn: async () => {
      const { data } = await api.get<{ data: TrendPoint[] }>('/business-analytics/trends', { params: { metric, months } });
      return data.data;
    },
  });
}
