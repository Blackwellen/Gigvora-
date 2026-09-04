// Domain 20 (Recruiter Standard) shared types. Field names mirror the real
// Postgres columns from apps/api/src/db/migrations/20260101000090_create_recruiter_standard_domain20.js
// so hooks can pass API responses straight through without remapping.

export type RecruiterSeat = {
  id: string;
  user_id: string;
  tier: 'standard' | 'pro';
  status: 'active' | 'trialing' | 'canceled';
  seats_purchased: number;
  activated_at: string;
  trial_ends_at: string | null;
};

export type CandidateSearchResult = {
  id: string;
  name: string;
  headline: string | null;
  location: string | null;
  skills: string[];
  open_to_work: boolean;
  avatar_url: string | null;
  match_score: number | null;
  matched_skills: string[];
  is_saved: boolean;
};

export type CandidateSave = {
  id: string;
  candidate_id: string;
  name: string;
  headline: string | null;
  location: string | null;
  avatar_url: string | null;
  open_to_work: boolean;
  note: string | null;
  tags: string[];
  status: 'saved' | 'contacted' | 'archived';
  saved_at: string;
};

export type CandidateNote = {
  id: string;
  recruiter_id: string;
  candidate_id: string;
  body: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
};

export type CandidateExperience = {
  id: string;
  title: string;
  org_name: string | null;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  description: string | null;
};

export type CandidateEducation = {
  id: string;
  institution_name: string;
  qualification: string | null;
  field: string | null;
  start_date: string | null;
  end_date: string | null;
};

export type CandidateEngagement = {
  profile_views_30d: number;
  response_rate_pct: number;
  avg_response_time_hours: number | null;
  last_active_at: string | null;
  availability_status: 'open_to_work' | 'open_to_offers' | 'not_looking';
  engagement_score: number;
  snapshot_date: string;
};

export type CandidateDetail = {
  id: string;
  name: string;
  email: string;
  headline: string | null;
  member_since: string;
  bio: string | null;
  location: string | null;
  industry: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  skills: string[];
  links: Record<string, string>;
  open_to_work: boolean;
  trust_score: number | null;
  trust_band: string | null;
  completeness_score: number | null;
  experiences: CandidateExperience[];
  education: CandidateEducation[];
  match_score: number | null;
  matched_skills: string[];
  past_applications_count: number;
  is_saved: boolean;
  save_status: CandidateSave['status'] | null;
  notes_count: number;
  pinned_note: { id: string; body: string; updated_at: string } | null;
  pool_memberships: Array<{ id: string; name: string }>;
  shortlist_memberships: Array<{ id: string; name: string }>;
  engagement: CandidateEngagement | null;
};

export type RecruiterTalentPoolMember = {
  id: string;
  pool_id: string;
  candidate_id: string | null;
  candidate_name: string;
  candidate_email: string | null;
  match_score: number | null;
  notes: string | null;
  added_at: string;
};

export type RecruiterTalentPool = {
  id: string;
  recruiter_id: string;
  name: string;
  description: string | null;
  member_count: number;
  status: 'active' | 'archived';
  tags: string[];
  created_at: string;
  updated_at: string;
  members?: RecruiterTalentPoolMember[];
};

export type RecruiterShortlistMember = {
  id: string;
  shortlist_id: string;
  candidate_id: string | null;
  candidate_name: string;
  rank: number | null;
  notes: string | null;
  added_at: string;
};

export type RecruiterShortlist = {
  id: string;
  recruiter_id: string;
  project_id: string | null;
  name: string;
  description: string | null;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
  members?: RecruiterShortlistMember[];
};

export type RecruiterProjectStage = 'sourced' | 'contacted' | 'screening' | 'shortlisted' | 'submitted' | 'rejected' | 'hired';

export type RecruiterProjectMember = {
  id: string;
  project_id: string;
  candidate_id: string | null;
  candidate_name: string;
  stage: RecruiterProjectStage;
  notes: string | null;
  added_at: string;
};

export type RecruiterProject = {
  id: string;
  recruiter_id: string;
  name: string;
  description: string | null;
  client_or_role: string | null;
  status: 'active' | 'on_hold' | 'completed' | 'archived';
  target_hires: number;
  filled_hires: number;
  target_date: string | null;
  created_at: string;
  updated_at: string;
  members?: RecruiterProjectMember[];
  members_by_stage?: Partial<Record<RecruiterProjectStage, RecruiterProjectMember[]>>;
};

export type RecruiterSavedSearch = {
  id: string;
  recruiter_id: string;
  name: string;
  filters: Record<string, unknown>;
  last_run_at: string | null;
  created_at: string;
};

export type RecruiterSearchAlert = {
  id: string;
  recruiter_id: string;
  saved_search_id: string | null;
  name: string;
  filters: Record<string, unknown>;
  frequency: 'instant' | 'daily' | 'weekly';
  status: 'active' | 'paused';
  last_run_at: string | null;
  new_matches_count: number;
  created_at: string;
};

export type RecruiterInboxThread = {
  thread_id: string;
  conversation_id: string;
  candidate_id: string | null;
  candidate_name: string;
  project_id: string | null;
  project_name: string | null;
  status: 'active' | 'snoozed' | 'archived';
  last_message: { body: string; createdAt: string; senderId: string } | null;
  unread_count: number;
  updated_at: string;
};

export type RecruiterAnalyticsOverview = {
  kpis: {
    saved_candidates_total: number;
    saved_candidates_by_status: Record<string, number>;
    candidate_notes_total: number;
    active_projects: number;
    total_projects: number;
    target_hires: number;
    filled_hires: number;
    fill_rate_pct: number;
    shortlists_total: number;
    talent_pools_total: number;
    active_search_alerts: number;
    active_inbox_threads: number;
  };
  pipeline_by_stage: Partial<Record<RecruiterProjectStage, number>>;
  saved_candidates_trend_30d: Array<{ date: string; count: number }>;
};

export type RecruiterHomeData = {
  seat: RecruiterSeat | null;
  kpis: {
    saved_candidates_total: number;
    active_projects: number;
    active_search_alerts: number;
    unread_inbox_conversations: number;
  };
  recent_saves: Array<{ id: string; candidate_id: string; name: string; headline: string | null; saved_at: string; status: string }>;
  recent_notes: Array<{ id: string; body: string; created_at: string; candidate_id: string; candidate_name: string }>;
  upcoming_projects: RecruiterProject[];
};

export type BillingMoney = { cents: number; currency: string; formatted: string } | null;

export type BillingPlanSummary = {
  key: string;
  name: string;
  audience: string;
  tagline: string;
  isCustomPrice: boolean;
  monthlyPrice: BillingMoney;
  annualPrice: BillingMoney;
  mostPopular: boolean;
  features: string[];
  ctaLabel: string;
  ctaAction: string;
};

export type RecruiterUpgradeComparison = {
  standardPlan: BillingPlanSummary | null;
  proPlan: BillingPlanSummary | null;
  seat: RecruiterSeat | null;
};

export type RecruiterUpgradeRequest = {
  id: string;
  user_id: string;
  requested_seats: number;
  billing_cycle: 'monthly' | 'annual';
  status: 'pending' | 'checkout_started' | 'completed' | 'cancelled';
  note: string | null;
  checkout_url: string | null;
  created_at: string;
};
