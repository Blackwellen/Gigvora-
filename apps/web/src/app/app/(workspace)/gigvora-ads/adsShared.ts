// Shared display mappings for the Gigvora Ads surfaces (dashboard, campaigns
// list, campaign detail, create wizard) — kept in one place so the status
// vocabulary and colors stay identical across every screen.
import type { AdCampaignStatus, AdObjective } from '@/hooks/useAds';

export const STATUS_LABEL: Record<AdCampaignStatus, string> = {
  draft: 'Draft',
  pending_review: 'Pending review',
  active: 'Active',
  paused: 'Paused',
  completed: 'Completed',
  rejected: 'Rejected',
};

export const STATUS_TONE: Record<AdCampaignStatus, 'brand' | 'neutral' | 'success' | 'warning' | 'danger'> = {
  draft: 'neutral',
  pending_review: 'warning',
  active: 'success',
  paused: 'warning',
  completed: 'neutral',
  rejected: 'danger',
};

export const OBJECTIVE_LABEL: Record<AdObjective, string> = {
  post_engagement: 'Promote a post',
  job_promotion: 'Promote a job',
  company_awareness: 'Promote your company page',
};

export const OBJECTIVE_SHORT_LABEL: Record<AdObjective, string> = {
  post_engagement: 'Post',
  job_promotion: 'Job',
  company_awareness: 'Company page',
};
