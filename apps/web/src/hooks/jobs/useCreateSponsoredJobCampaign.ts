'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// Mirrors the `sponsored_job_campaigns` table (see domain16-spec.md) exactly — this module is thin like
// jobs/applications, so payloads use the real Postgres column names (snake_case), not camelCase.
export type SponsoredJobBidType = 'cpc' | 'cpa' | 'flat';
export type SponsoredJobCampaignStatus = 'draft' | 'active' | 'paused' | 'completed';
export type SponsoredJobGoal = 'visibility' | 'applicant_volume' | 'premium_placement';

// `sponsored_job_campaigns.targeting` is a single jsonb column — campaign goal and ad-creative fields
// (which have no dedicated columns in the migration) are packed into it alongside audience targeting.
export type SponsoredJobTargeting = {
  goal: SponsoredJobGoal;
  locations: string[];
  categories: string[];
  audience: string[];
  headline: string;
  highlight_fields: string[];
};

export type SponsoredJobCampaign = {
  id: string;
  job_id: string;
  company_id: string | null;
  budget_total: number;
  budget_daily: number;
  bid_type: SponsoredJobBidType;
  bid_amount: number;
  status: SponsoredJobCampaignStatus;
  starts_at: string;
  ends_at: string | null;
  targeting: SponsoredJobTargeting;
  created_at: string;
  updated_at: string;
};

export type CreateSponsoredJobCampaignInput = {
  job_id: string;
  budget_total: number;
  budget_daily: number;
  bid_type: SponsoredJobBidType;
  bid_amount: number;
  starts_at: string;
  ends_at: string | null;
  targeting: SponsoredJobTargeting;
  status: 'active' | 'draft';
};

/** POST /sponsored-jobs — creates a paid sponsorship campaign for an existing job. Used by the
 * sponsored-job-setup wizard's "Launch campaign" (status: 'active') and "Save as draft" (status: 'draft')
 * actions. */
export function useCreateSponsoredJobCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateSponsoredJobCampaignInput) => {
      const { data } = await api.post<{ data: SponsoredJobCampaign }>('/sponsored-jobs', input);
      return data.data;
    },
    onSuccess: (campaign) => {
      queryClient.invalidateQueries({ queryKey: ['sponsored-jobs', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['sponsored-jobs', 'by-job', campaign.job_id] });
      queryClient.invalidateQueries({ queryKey: ['jobs', 'detail', campaign.job_id] });
    },
  });
}
