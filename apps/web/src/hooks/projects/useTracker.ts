'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type TrackerSession = {
  id: string;
  projectId: string;
  timeEntryId: string;
  userId: string;
  consentGiven: boolean;
  screenshotsEnabled: boolean;
  screenshotIntervalMinutes: number | null;
  status: 'active' | 'paused' | 'stopped';
  createdAt: string;
};

export function useActiveTrackerSession(projectId: string | undefined) {
  return useQuery({
    queryKey: ['pm-projects', projectId, 'tracker-session'],
    queryFn: async () => {
      const { data } = await api.get<{ data: TrackerSession | null }>(`/pm-projects/${projectId}/tracker/sessions/active`);
      return data.data;
    },
    enabled: Boolean(projectId),
  });
}

export function useStartTrackerSession(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { timeEntryId: string; consentGiven: boolean; screenshotsEnabled?: boolean; screenshotIntervalMinutes?: number }) => {
      const { data } = await api.post<{ data: TrackerSession }>(`/pm-projects/${projectId}/tracker/sessions`, input);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pm-projects', projectId, 'tracker-session'] }),
  });
}

export function useStopTrackerSession(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => api.post(`/pm-projects/${projectId}/tracker/sessions/${sessionId}/stop`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pm-projects', projectId, 'tracker-session'] }),
  });
}
