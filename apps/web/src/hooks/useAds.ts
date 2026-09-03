'use client';

// Backed by the real Gigvora Ads domain — apps/api/src/modules/ads. Real
// campaign lifecycle, real targeting, real budget/spend accounting, real
// Stripe billing collection (same Stripe customer as the platform's own
// subscription billing — see adsBillingPortal.controller.js). Nothing here
// is fabricated: a brand-new advertiser legitimately sees all-zero spend and
// an empty campaign list until they create their first campaign.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type AdCampaignStatus = 'draft' | 'pending_review' | 'active' | 'paused' | 'completed' | 'rejected';
export type AdObjective = 'post_engagement' | 'job_promotion' | 'company_awareness';

export type AdAccountSummary = {
  accountId: string;
  status: string;
  lifetimeSpendCents: number;
  spendTodayCents: number;
  spendThisMonthCents: number;
  campaignCounts: Partial<Record<AdCampaignStatus, number>>;
};

export type AdTargeting = {
  locations?: string[];
  industries?: string[];
  skills?: string[];
  openToWorkOnly?: boolean;
};

export type AdCampaign = {
  id: string;
  accountId: string;
  name: string;
  objective: AdObjective;
  status: AdCampaignStatus;
  dailyBudgetCents: number;
  totalBudgetCents: number;
  spentCents: number;
  spentTodayCents: number;
  startDate: string;
  endDate: string | null;
  targeting: AdTargeting;
  costPerImpressionCents: number;
  costPerClickCents: number;
  createdAt: string;
  updatedAt: string;
};

export type AdCreative = {
  id: string;
  contentType: 'post' | 'job' | 'company';
  contentId: string;
  headline: string | null;
  destinationUrl: string | null;
  reviewStatus: 'pending_review' | 'approved' | 'rejected';
  rejectionReason: string | null;
};

export type AdCampaignPerformance = {
  impressions: number;
  clicks: number;
  ctr: number; // percent, e.g. 4.5
  spendFromImpressionsCents: number;
  spendFromClicksCents: number;
};

export type AdCampaignDetail = AdCampaign & {
  creative: AdCreative | null;
  performance: AdCampaignPerformance;
};

export type CreateAdCampaignPayload = {
  name: string;
  objective: AdObjective;
  dailyBudgetCents: number;
  totalBudgetCents: number;
  startDate: string;
  endDate?: string;
  targeting?: AdTargeting;
  contentId: string;
  headline?: string;
  destinationUrl?: string;
};

export type UpdateAdCampaignPayload = {
  name?: string;
  dailyBudgetCents?: number;
  totalBudgetCents?: number;
  endDate?: string | null;
  targeting?: AdTargeting;
};

export type AdBillingEvent = {
  id: string;
  campaignId: string | null;
  type: 'spend_accrued' | 'charge_collected' | 'charge_failed';
  amountCents: number;
  stripeChargeId: string | null;
  createdAt: string;
};

function invalidateCampaign(queryClient: ReturnType<typeof useQueryClient>, id: string) {
  queryClient.invalidateQueries({ queryKey: ['ad-campaign', id] });
  queryClient.invalidateQueries({ queryKey: ['ad-campaigns'] });
  queryClient.invalidateQueries({ queryKey: ['ad-account'] });
}

export function useAdAccount() {
  return useQuery({
    queryKey: ['ad-account'],
    queryFn: async () => (await api.get<{ data: AdAccountSummary }>('/ads/account')).data.data,
    staleTime: 15_000,
  });
}

export function useAdCampaigns(status?: AdCampaignStatus) {
  return useQuery({
    queryKey: ['ad-campaigns', status ?? 'all'],
    queryFn: async () => (await api.get<{ data: AdCampaign[] }>('/ads/campaigns', { params: status ? { status } : undefined })).data.data,
    staleTime: 10_000,
  });
}

export function useAdCampaign(id: string | null | undefined) {
  return useQuery({
    queryKey: ['ad-campaign', id],
    queryFn: async () => (await api.get<{ data: AdCampaignDetail }>(`/ads/campaigns/${id}`)).data.data,
    enabled: Boolean(id),
    staleTime: 10_000,
  });
}

export function useCreateAdCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateAdCampaignPayload) => (await api.post<{ data: AdCampaign }>('/ads/campaigns', payload)).data.data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['ad-account'] });
    },
  });
}

export function useUpdateAdCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & UpdateAdCampaignPayload) =>
      (await api.patch<{ data: AdCampaignDetail }>(`/ads/campaigns/${id}`, patch)).data.data,
    onSuccess: (_data, { id }) => invalidateCampaign(queryClient, id),
  });
}

export function useSubmitCampaignForReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.post<{ data: AdCampaignDetail }>(`/ads/campaigns/${id}/submit-for-review`)).data.data,
    onSuccess: (_data, id) => invalidateCampaign(queryClient, id),
  });
}

export function usePauseAdCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.post<{ data: AdCampaignDetail }>(`/ads/campaigns/${id}/pause`)).data.data,
    onSuccess: (_data, id) => invalidateCampaign(queryClient, id),
  });
}

export function useResumeAdCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.post<{ data: AdCampaignDetail }>(`/ads/campaigns/${id}/resume`)).data.data,
    onSuccess: (_data, id) => invalidateCampaign(queryClient, id),
  });
}

export function useAdBillingHistory(limit = 20) {
  return useQuery({
    queryKey: ['ad-billing-history', limit],
    queryFn: async () => (await api.get<{ data: AdBillingEvent[] }>('/ads/billing-history', { params: { limit } })).data.data,
    staleTime: 15_000,
  });
}

export function useCreateAdsBillingPortal() {
  return useMutation({
    mutationFn: async (returnUrl?: string) => (await api.post<{ data: { url: string } }>('/ads/billing-portal', { returnUrl })).data.data,
  });
}
