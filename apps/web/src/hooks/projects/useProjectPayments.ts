'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PmPaymentMilestone, PmPaymentMilestoneStatus } from './types';

export function useProjectPaymentMilestones(projectId: string | undefined) {
  return useQuery({
    queryKey: ['pm-projects', projectId, 'payment-milestones'],
    queryFn: async () => {
      const { data } = await api.get<{ data: PmPaymentMilestone[] }>(`/pm-projects/${projectId}/payment-milestones`);
      return data.data;
    },
    enabled: Boolean(projectId),
  });
}

export function useCreatePaymentMilestone(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { milestoneId: string; payeeUserId: string; amount: number; currency?: string }) => api.post(`/pm-projects/${projectId}/payment-milestones`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pm-projects', projectId, 'payment-milestones'] }),
  });
}

export function useUpdatePaymentMilestoneStatus(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ paymentMilestoneId, status }: { paymentMilestoneId: string; status: PmPaymentMilestoneStatus }) =>
      api.patch(`/pm-projects/${projectId}/payment-milestones/${paymentMilestoneId}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pm-projects', projectId, 'payment-milestones'] }),
  });
}

export function useReleasePayment(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (paymentMilestoneId: string) => api.post(`/pm-projects/${projectId}/payment-milestones/${paymentMilestoneId}/release`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pm-projects', projectId, 'payment-milestones'] }),
  });
}

/** Step 1 of funding: creates a hosted Stripe Checkout URL that authorizes (escrows) the
 * milestone amount without capturing it. Caller should redirect the browser to the returned url. */
export function useCreateFundingCheckout(projectId: string | undefined) {
  return useMutation({
    mutationFn: async (paymentMilestoneId: string) => {
      const { data } = await api.post<{ data: { url: string } }>(`/pm-projects/${projectId}/payment-milestones/${paymentMilestoneId}/checkout-session`);
      return data.data;
    },
  });
}

/** Step 2 of funding: called after Stripe redirects back with ?fundedSessionId=, verifies the
 * authorization actually happened before the milestone is marked "funded". */
export function useConfirmFunding(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ paymentMilestoneId, sessionId }: { paymentMilestoneId: string; sessionId: string }) => {
      const { data } = await api.post<{ data: PmPaymentMilestone }>(`/pm-projects/${projectId}/payment-milestones/${paymentMilestoneId}/confirm-funding`, { sessionId });
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pm-projects', projectId, 'payment-milestones'] }),
  });
}
