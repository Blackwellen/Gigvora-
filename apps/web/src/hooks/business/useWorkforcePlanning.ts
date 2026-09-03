'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  WorkforcePlan,
  WorkforcePlanDetail,
  WorkforcePlanInput,
  WorkforcePlanStatus,
  WorkforceScenario,
  WorkforceScenarioInput,
} from './types';

export type WorkforcePlansFilter = { status?: WorkforcePlanStatus; department_id?: string };

/** GET /workforce-planning/plans — capacity/scenario planning list (19.17). */
export function useWorkforcePlans(filter: WorkforcePlansFilter = {}) {
  return useQuery({
    queryKey: ['workforce-planning', 'plans', filter],
    queryFn: async () => {
      const { data } = await api.get<{ data: WorkforcePlan[]; meta: { total: number } }>('/workforce-planning/plans', { params: filter });
      return data;
    },
  });
}

export function useWorkforcePlan(id: string | undefined) {
  return useQuery({
    queryKey: ['workforce-planning', 'plan-detail', id],
    queryFn: async () => {
      const { data } = await api.get<{ data: WorkforcePlanDetail }>(`/workforce-planning/plans/${id}`);
      return data.data;
    },
    enabled: Boolean(id),
    retry: 1,
  });
}

export function useCreateWorkforcePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: WorkforcePlanInput) => {
      const { data } = await api.post<{ data: WorkforcePlan }>('/workforce-planning/plans', body);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workforce-planning', 'plans'] }),
  });
}

export function useUpdateWorkforcePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<WorkforcePlanInput> & { id: string }) => {
      const { data } = await api.patch<{ data: WorkforcePlan }>(`/workforce-planning/plans/${id}`, body);
      return data.data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['workforce-planning', 'plans'] });
      queryClient.invalidateQueries({ queryKey: ['workforce-planning', 'plan-detail', vars.id] });
    },
  });
}

export function useCreateWorkforceScenario(planId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: WorkforceScenarioInput) => {
      const { data } = await api.post<{ data: WorkforceScenario }>(`/workforce-planning/plans/${planId}/scenarios`, body);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workforce-planning', 'plan-detail', planId] }),
  });
}

/** PATCH /workforce-planning/scenarios/:id — pass `{is_selected: true}` to activate a scenario. */
export function useUpdateWorkforceScenario(planId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<WorkforceScenarioInput> & { id: string; is_selected?: boolean }) => {
      const { data } = await api.patch<{ data: WorkforceScenario }>(`/workforce-planning/scenarios/${id}`, body);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workforce-planning', 'plan-detail', planId] }),
  });
}
