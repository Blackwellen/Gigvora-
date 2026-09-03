'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { HireHandoff } from './types';

export function useHireHandoffByApplication(applicationId: string | undefined) {
  return useQuery({
    queryKey: ['hire-handoffs', 'by-application', applicationId],
    queryFn: async () => {
      const { data } = await api.get<{ data: HireHandoff | null }>(`/hire-handoffs/by-application/${applicationId}`);
      return data.data;
    },
    enabled: Boolean(applicationId),
    retry: false,
  });
}

export function useCreateHireHandoff(applicationId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { startDate?: string; onboardingOwnerId?: string; notes?: string }) => {
      const { data } = await api.post<{ data: HireHandoff }>('/hire-handoffs', { applicationId, ...input });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hire-handoffs', 'by-application', applicationId] });
    },
  });
}

export function useUpdateHireHandoff(handoffId: string | undefined, applicationId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Pick<HireHandoff, 'status' | 'start_date' | 'onboarding_owner_id' | 'checklist' | 'notes'>>) => {
      const { data } = await api.patch<{ data: HireHandoff }>(`/hire-handoffs/${handoffId}`, patch);
      return data.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['hire-handoffs', 'by-application', applicationId], data);
    },
  });
}
