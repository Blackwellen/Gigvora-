'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type TourStep = { key: string; title: string; body: string; target: string };

export type TourProgress = {
  id?: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'dismissed';
  current_step_index: number;
  started_at?: string | null;
  completed_at?: string | null;
  dismissed_at?: string | null;
};

/** Matches productTour.service.js#getTour exactly: { tourKey, config: { version, steps }, progress }. */
export type TourResponse = {
  tourKey: string;
  config: { version: number; steps: TourStep[] };
  progress: TourProgress;
};

export function useProductTour(tourKey: string) {
  return useQuery({
    queryKey: ['product-tour', tourKey],
    queryFn: async () => {
      const { data } = await api.get<{ data: TourResponse }>(`/product-tour/${tourKey}`);
      return data.data;
    },
  });
}

export function useStartTour(tourKey: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ data: TourProgress }>(`/product-tour/${tourKey}/start`);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['product-tour', tourKey] }),
  });
}

export function useTourStep(tourKey: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (stepIndex: number) => {
      const { data } = await api.post<{ data: TourProgress }>(`/product-tour/${tourKey}/step`, { stepIndex });
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['product-tour', tourKey] }),
  });
}

export function useCompleteTour(tourKey: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ data: TourProgress }>(`/product-tour/${tourKey}/complete`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-tour', tourKey] });
      queryClient.invalidateQueries({ queryKey: ['setup-checklist'] });
    },
  });
}

export function useDismissTour(tourKey: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ data: TourProgress }>(`/product-tour/${tourKey}/dismiss`);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['product-tour', tourKey] }),
  });
}
