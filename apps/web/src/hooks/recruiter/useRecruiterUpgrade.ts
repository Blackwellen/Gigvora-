'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { RecruiterUpgradeComparison, RecruiterUpgradeRequest } from './types';

/** GET /recruiter-upgrade/comparison — Upgrade to Recruiter Pro (20.12). Pricing comes straight from the real Billing/Product Catalogue. */
export function useRecruiterUpgradeComparison() {
  return useQuery({
    queryKey: ['recruiter', 'upgrade', 'comparison'],
    queryFn: async () => {
      const { data } = await api.get<{ data: RecruiterUpgradeComparison }>('/recruiter-upgrade/comparison');
      return data.data;
    },
  });
}

export function useMyUpgradeRequests() {
  return useQuery({
    queryKey: ['recruiter', 'upgrade', 'requests'],
    queryFn: async () => {
      const { data } = await api.get<{ data: RecruiterUpgradeRequest[]; meta: { total: number } }>('/recruiter-upgrade/requests');
      return data;
    },
  });
}

export function useCreateUpgradeRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { requested_seats?: number; billing_cycle?: 'monthly' | 'annual'; note?: string }) => {
      const { data } = await api.post<{ data: RecruiterUpgradeRequest }>('/recruiter-upgrade/requests', body);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recruiter', 'upgrade', 'requests'] }),
  });
}
