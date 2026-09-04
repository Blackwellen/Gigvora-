'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type ReportReason = { code: string; label: string; description: string | null; sort_order: number };

export function useReportReasons() {
  return useQuery({
    queryKey: ['report-reasons'],
    queryFn: async () => (await api.get<{ data: ReportReason[] }>('/trust/reports/reasons')).data.data,
    staleTime: 60 * 60 * 1000,
  });
}

export function useSubmitReport() {
  return useMutation({
    mutationFn: async (payload: { objectType: string; objectId: string; reasonCode: string; description?: string }) =>
      (await api.post('/trust/reports', payload)).data.data,
  });
}
