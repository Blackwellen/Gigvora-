'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Department, DepartmentDetail } from './types';

export type DepartmentsFilter = { status?: string };

/** GET /departments — powers the Departments list (19.06) and the Organisation hierarchy tab (19.03). */
export function useDepartments(filter: DepartmentsFilter = {}) {
  return useQuery({
    queryKey: ['business', 'departments', 'list', filter],
    queryFn: async () => {
      const { data } = await api.get<{ data: Department[]; meta: { total: number } }>('/departments', { params: filter });
      return data;
    },
  });
}

/** GET /departments/:id — department detail + child departments + teams, shown in the Departments-page drawer. */
export function useDepartment(id: string | undefined) {
  return useQuery({
    queryKey: ['business', 'departments', 'detail', id],
    queryFn: async () => {
      const { data } = await api.get<{ data: DepartmentDetail }>(`/departments/${id}`);
      return data.data;
    },
    enabled: Boolean(id),
  });
}

export type DepartmentInput = {
  name: string;
  parent_department_id?: string | null;
  cost_center_code?: string;
  description?: string;
  head_user_id?: string | null;
  budget_annual?: number;
  currency?: string;
  headcount_target?: number;
};

export function useCreateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: DepartmentInput) => {
      const { data } = await api.post<{ data: Department }>('/departments', body);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['business', 'departments'] }),
  });
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<DepartmentInput> & { id: string; status?: string }) => {
      const { data } = await api.patch<{ data: Department }>(`/departments/${id}`, body);
      return data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['business', 'departments', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['business', 'departments', 'detail', variables.id] });
    },
  });
}

export function useArchiveDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/departments/${id}`);
      return id;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['business', 'departments'] }),
  });
}
