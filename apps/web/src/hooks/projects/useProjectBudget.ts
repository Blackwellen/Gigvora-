'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PmBudget, PmExpense } from './types';

export function useProjectBudget(projectId: string | undefined) {
  return useQuery({
    queryKey: ['pm-projects', projectId, 'budget'],
    queryFn: async () => {
      const { data } = await api.get<{ data: PmBudget }>(`/pm-projects/${projectId}/budget`);
      return data.data;
    },
    enabled: Boolean(projectId),
  });
}

export function useSetProjectBudget(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { totalBudget: number; contingencyPct?: number; currency?: string }) => api.put(`/pm-projects/${projectId}/budget`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pm-projects', projectId, 'budget'] }),
  });
}

export function useAddBudgetLine(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { category: string; kind?: string; plannedAmount: number; milestoneId?: string }) => api.post(`/pm-projects/${projectId}/budget/lines`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pm-projects', projectId, 'budget'] }),
  });
}

export function useProjectExpenses(projectId: string | undefined) {
  return useQuery({
    queryKey: ['pm-projects', projectId, 'expenses'],
    queryFn: async () => {
      const { data } = await api.get<{ data: PmExpense[] }>(`/pm-projects/${projectId}/budget/expenses`);
      return data.data;
    },
    enabled: Boolean(projectId),
  });
}

export function useSubmitExpense(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { description: string; amount: number; incurredOn: string; budgetLineId?: string }) => api.post(`/pm-projects/${projectId}/budget/expenses`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-projects', projectId, 'expenses'] });
      queryClient.invalidateQueries({ queryKey: ['pm-projects', projectId, 'budget'] });
    },
  });
}

export function useReviewExpense(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ expenseId, status }: { expenseId: string; status: 'approved' | 'paid' | 'rejected' }) => api.patch(`/pm-projects/${projectId}/budget/expenses/${expenseId}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-projects', projectId, 'expenses'] });
      queryClient.invalidateQueries({ queryKey: ['pm-projects', projectId, 'budget'] });
    },
  });
}
