'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { AdvancedAlert, SeverityLevel } from './types';

function invalidate(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['recruiter-pro', 'alerts'] });
  queryClient.invalidateQueries({ queryKey: ['recruiter-pro', 'home'] });
}

/** GET /advanced-alerts — alert list with severity + read state (21.11). */
export function useAdvancedAlerts(params: { severity?: SeverityLevel | 'all'; readState?: 'all' | 'unread' | 'read' }) {
  return useQuery({
    queryKey: ['recruiter-pro', 'alerts', params],
    queryFn: async () => {
      const { data } = await api.get<{ data: AdvancedAlert[] }>('/advanced-alerts', {
        params: {
          severity: params.severity && params.severity !== 'all' ? params.severity : undefined,
          read: params.readState === 'all' || !params.readState ? undefined : params.readState === 'read',
        },
      });
      return data.data;
    },
  });
}

export function useMarkAlertRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch<{ data: AdvancedAlert }>(`/advanced-alerts/${id}`, { is_read: true });
      return data.data;
    },
    onSuccess: () => invalidate(queryClient),
  });
}

export function useResolveAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch<{ data: AdvancedAlert }>(`/advanced-alerts/${id}`, { is_resolved: true });
      return data.data;
    },
    onSuccess: () => invalidate(queryClient),
  });
}
