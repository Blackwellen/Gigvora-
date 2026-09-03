'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PmTimesheet } from './types';

export function useProjectTimesheets(projectId: string | undefined, mine = false) {
  return useQuery({
    queryKey: ['pm-projects', projectId, 'timesheets', mine],
    queryFn: async () => {
      const { data } = await api.get<{ data: PmTimesheet[] }>(`/pm-projects/${projectId}/timesheets`, { params: mine ? { mine: 'true' } : undefined });
      return data.data;
    },
    enabled: Boolean(projectId),
  });
}

export function useSubmitTimesheet(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (weekStart: string) => {
      const { data } = await api.post<{ data: PmTimesheet }>(`/pm-projects/${projectId}/timesheets/submit`, { weekStart });
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pm-projects', projectId, 'timesheets'] }),
  });
}

export function useReviewTimesheet(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ timesheetId, status, reviewNote }: { timesheetId: string; status: 'approved' | 'rejected'; reviewNote?: string }) => {
      const { data } = await api.patch<{ data: PmTimesheet }>(`/pm-projects/${projectId}/timesheets/${timesheetId}`, { status, reviewNote });
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pm-projects', projectId, 'timesheets'] }),
  });
}
