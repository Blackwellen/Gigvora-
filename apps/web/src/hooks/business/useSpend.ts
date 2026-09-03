'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { SpendBudget, SpendItem, SpendSummary } from './types';

export type SpendFilter = {
  category?: string;
  department_id?: string;
  team_id?: string;
  status?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
};

/** GET /spend — the transaction ledger DataTable on the Spend page (19.15). */
export function useSpendList(filter: SpendFilter = {}) {
  return useQuery({
    queryKey: ['business', 'spend', 'list', filter],
    queryFn: async () => {
      const { data } = await api.get<{ data: SpendItem[]; meta: { total: number } }>('/spend', { params: filter });
      return data;
    },
  });
}

/** GET /spend/summary — KPI strip + category/trend charts on the Spend page. */
export function useSpendSummary(period?: string) {
  return useQuery({
    queryKey: ['business', 'spend', 'summary', period],
    queryFn: async () => {
      const { data } = await api.get<{ data: SpendSummary }>('/spend/summary', { params: { period } });
      return data.data;
    },
  });
}

/** GET /spend/budgets — the Budgets sub-section on the Spend page. */
export function useSpendBudgets(period?: string) {
  return useQuery({
    queryKey: ['business', 'spend', 'budgets', period],
    queryFn: async () => {
      const { data } = await api.get<{ data: SpendBudget[]; meta: { total: number } }>('/spend/budgets', { params: { period } });
      return data;
    },
  });
}

export type SpendInput = {
  category: string;
  vendor?: string;
  description: string;
  amount: number;
  currency: string;
  spend_date: string;
  department_id?: string;
  team_id?: string;
};

export function useLogSpend() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: SpendInput) => {
      const { data } = await api.post<{ data: SpendItem }>('/spend', body);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['business', 'spend'] }),
  });
}

export function useUpdateSpend() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; status?: string; is_anomaly?: boolean; anomaly_reason?: string }) => {
      const { data } = await api.patch<{ data: SpendItem }>(`/spend/${id}`, body);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['business', 'spend'] }),
  });
}

export type SpendBudgetInput = {
  department_id?: string;
  team_id?: string;
  period: string;
  category: string;
  allocated_amount: number;
  currency: string;
};

export function useCreateSpendBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: SpendBudgetInput) => {
      const { data } = await api.post<{ data: SpendBudget }>('/spend/budgets', body);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['business', 'spend', 'budgets'] }),
  });
}

export function useUpdateSpendBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<SpendBudgetInput> & { id: string }) => {
      const { data } = await api.patch<{ data: SpendBudget }>(`/spend/budgets/${id}`, body);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['business', 'spend', 'budgets'] }),
  });
}
