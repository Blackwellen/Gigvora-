'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { HiringBottleneck, HiringOverview, HiringPlan, HiringPlanInput, HiringPlanPriority, HiringPlanStatus } from './types';

/** GET /hiring/overview — KPI strip + funnel for the Hiring command centre (19.07). */
export function useHiringOverview() {
  return useQuery({
    queryKey: ['hiring', 'overview'],
    queryFn: async () => {
      const { data } = await api.get<{ data: HiringOverview }>('/hiring/overview');
      return data.data;
    },
  });
}

export type HiringPlansFilter = { status?: HiringPlanStatus; priority?: HiringPlanPriority; department_id?: string };

export function useHiringPlans(filter: HiringPlansFilter = {}) {
  return useQuery({
    queryKey: ['hiring', 'plans', filter],
    queryFn: async () => {
      const { data } = await api.get<{ data: HiringPlan[]; meta: { total: number } }>('/hiring/plans', { params: filter });
      return data;
    },
  });
}

export function useCreateHiringPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: HiringPlanInput) => {
      const { data } = await api.post<{ data: HiringPlan }>('/hiring/plans', body);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hiring', 'plans'] });
      queryClient.invalidateQueries({ queryKey: ['hiring', 'overview'] });
    },
  });
}

export function useUpdateHiringPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<HiringPlanInput> & { id: string }) => {
      const { data } = await api.patch<{ data: HiringPlan }>(`/hiring/plans/${id}`, body);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hiring', 'plans'] });
      queryClient.invalidateQueries({ queryKey: ['hiring', 'overview'] });
    },
  });
}

export function useDeleteHiringPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/hiring/plans/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hiring', 'plans'] });
      queryClient.invalidateQueries({ queryKey: ['hiring', 'overview'] });
    },
  });
}

/** GET /hiring/bottlenecks — avg days per funnel stage, powers the bottleneck panel. */
export function useHiringBottlenecks() {
  return useQuery({
    queryKey: ['hiring', 'bottlenecks'],
    queryFn: async () => {
      const { data } = await api.get<{ data: HiringBottleneck[] }>('/hiring/bottlenecks');
      return data.data;
    },
  });
}
