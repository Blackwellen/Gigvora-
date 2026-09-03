// Shared types for Domain 19 (Business Workspace, Hiring & Workforce Operations).
// snake_case fields mirror the API contract exactly — do not camelCase these.

import type { ApplicationAnswer, ApplicationStatus, InterviewStatus, InterviewType, OfferStatus } from '@/hooks/jobs/types';

export type BusinessWorkspace = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  website: string | null;
  industry: string | null;
  size: string | null;
  created_at: string;
  member_count: number;
  team_count: number;
  department_count: number;
  open_jobs_count: number;
};

export type BusinessRole = {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  permissions: string[];
  member_count: number;
  created_at: string;
};

export type Team = {
  id: string;
  company_id: string;
  department_id: string | null;
  department_name: string | null;
  name: string;
  function: string | null;
  description: string | null;
  lead_user_id: string | null;
  lead_name: string | null;
  capacity_hours_per_week: number | null;
  utilisation_pct: number | null;
  color: string | null;
  status: 'active' | 'archived' | string;
  member_count: number;
  created_at: string;
};

export type TeamMember = {
  id: string;
  user_id: string;
  name: string;
  avatar_url: string | null;
  headline: string | null;
  role: string;
  allocation_pct: number;
  status: string;
  joined_at: string;
};

export type TeamDetail = Team & { members: TeamMember[] };

export type Department = {
  id: string;
  company_id: string;
  parent_department_id: string | null;
  name: string;
  cost_center_code: string | null;
  description: string | null;
  head_user_id: string | null;
  head_name: string | null;
  budget_annual: number | null;
  currency: string;
  headcount_target: number | null;
  team_count: number;
  member_count: number;
  spent_ytd: number;
  status: 'active' | 'archived' | string;
  created_at: string;
};

export type DepartmentDetail = Department & {
  child_departments: Department[];
  teams: Team[];
};

export type BusinessMember = {
  id: string;
  company_id: string;
  user_id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  role: string;
  status: 'active' | 'invited' | 'suspended' | string;
  is_starred: boolean;
  last_active_at: string | null;
  team_names: string[];
  department_name: string | null;
};

export type SpendItem = {
  id: string;
  company_id: string;
  department_id: string | null;
  department_name: string | null;
  team_id: string | null;
  team_name: string | null;
  category: string;
  vendor: string | null;
  description: string;
  amount: number;
  currency: string;
  spend_date: string;
  status: 'pending' | 'approved' | 'rejected' | string;
  is_anomaly: boolean;
  anomaly_reason: string | null;
  created_at: string;
};

export type SpendSummary = {
  by_category: Array<{ category: string; total: number }>;
  by_department: Array<{ department_id: string; department_name: string; total: number }>;
  monthly_trend: Array<{ month: string; total: number }>;
  anomaly_count: number;
  total_mtd: number;
  total_flagged: number;
};

export type SpendBudget = {
  id: string;
  company_id: string;
  department_id: string | null;
  department_name: string | null;
  team_id: string | null;
  team_name: string | null;
  period: string;
  category: string;
  allocated_amount: number;
  spent_amount: number;
  utilisation_pct: number;
  currency: string;
  status: string;
};

export type BusinessOverview = {
  headcount: { current: number; target: number };
  open_roles: number;
  hires_this_quarter: number;
  spend_mtd: number;
  spend_currency: string;
  avg_team_utilisation_pct: number;
  hiring_funnel: Array<{ stage: string; count: number }>;
  top_departments_by_spend: Array<{ department_id: string; department_name: string; total: number }>;
  workforce_plan_progress: { current_headcount: number; target_headcount: number; plan_name: string } | null;
};

export type TrendMetric = 'headcount' | 'spend' | 'hiring';

export type TrendPoint = { month: string; value: number };

// ---- Hiring (19.07) ----
export type HiringPlanPriority = 'low' | 'medium' | 'high' | 'critical';
export type HiringPlanStatus = 'draft' | 'open' | 'on_hold' | 'filled' | 'cancelled';

export type HiringOverview = {
  open_roles: number;
  total_target_hires: number;
  total_filled_hires: number;
  avg_time_to_hire_days: number | null;
  funnel: Array<{ stage: string; count: number }>;
};

export type HiringPlan = {
  id: string;
  company_id: string;
  department_id: string | null;
  department_name: string | null;
  team_id: string | null;
  team_name: string | null;
  job_id: string | null;
  job_title: string | null;
  role_title: string;
  target_hires: number;
  filled_hires: number;
  priority: HiringPlanPriority;
  target_date: string | null;
  status: HiringPlanStatus;
  owner_id: string | null;
  notes: string | null;
  created_at: string;
};

export type HiringPlanInput = {
  department_id?: string;
  team_id?: string;
  job_id?: string;
  role_title: string;
  target_hires: number;
  priority: HiringPlanPriority;
  target_date?: string;
  status?: HiringPlanStatus;
  notes?: string;
};

export type HiringBottleneck = { stage: string; avg_days: number; application_count: number };

// ---- Talent Discovery (19.08) ----
export type TalentCandidate = {
  id: string;
  name: string;
  headline: string | null;
  location: string | null;
  skills: string[];
  open_to_work: boolean;
  avatar_url: string | null;
  match_score: number | null;
  matched_skills: string[];
};

export type TalentCandidateDetail = TalentCandidate & {
  past_applications_to_company: number;
  bio?: string | null;
  email?: string | null;
  experience_years?: number | null;
};

// ---- Talent Pools (19.10) ----
export type TalentPoolType = 'sourced' | 'referral' | 'silver_medalist' | 'alumni' | 'general' | string;
export type TalentPoolStatus = 'active' | 'archived';

export type TalentPool = {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  pool_type: TalentPoolType;
  owner_id: string | null;
  member_count: number;
  status: TalentPoolStatus;
  tags: string[];
  created_at: string;
};

export type TalentPoolMember = {
  id: string;
  user_id: string | null;
  candidate_name: string;
  candidate_email: string | null;
  source: string | null;
  match_score: number | null;
  notes: string | null;
  added_at: string;
};

export type TalentPoolDetail = TalentPool & { members: TalentPoolMember[] };

export type TalentPoolInput = { name: string; description?: string; pool_type: TalentPoolType; tags?: string[]; status?: TalentPoolStatus };

export type TalentPoolMemberInput = {
  user_id?: string;
  candidate_name: string;
  candidate_email?: string;
  source?: string;
  match_score?: number;
  notes?: string;
};

// ---- Cross-job Applicants (19.09) ----
export type BusinessApplicant = {
  id: string;
  status: ApplicationStatus;
  match_score: number | null;
  applied_at: string;
  job_id: string;
  job_title: string;
  applicant_id: string;
  applicant_name: string;
  applicant_headline: string | null;
  applicant_avatar_url: string | null;
};

export type BusinessApplicantDetail = BusinessApplicant & {
  resume_url?: string | null;
  cover_letter?: string | null;
  answers?: ApplicationAnswer[];
};

export type BusinessApplicantsSummary = { by_status: Array<{ status: string; count: number }>; total: number };

// ---- Shortlists (19.11) ----
export type ShortlistStatus = 'active' | 'archived';

export type Shortlist = {
  id: string;
  company_id: string;
  job_id: string | null;
  job_title: string | null;
  name: string;
  description: string | null;
  owner_id: string | null;
  status: ShortlistStatus;
  member_count: number;
  created_at: string;
};

export type ShortlistMember = {
  id: string;
  application_id: string | null;
  user_id: string | null;
  candidate_name: string;
  rank: number;
  notes: string | null;
  added_at: string;
};

export type ShortlistDetail = Shortlist & { members: ShortlistMember[] };

export type ShortlistInput = { name: string; description?: string; job_id?: string; status?: ShortlistStatus };

export type ShortlistMemberInput = { application_id?: string; user_id?: string; candidate_name: string; rank?: number; notes?: string };

// ---- Cross-job Interviews (19.12) ----
export type BusinessInterview = {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
  type: InterviewType;
  status: InterviewStatus;
  round_number: number | null;
  job_id: string;
  job_title: string;
  application_id: string;
  candidate_name: string;
  location_or_link: string | null;
  interviewer_ids: string[];
};

// ---- Cross-business Offers (19.13) ----
export type BusinessOffer = {
  id: string;
  status: OfferStatus;
  base_salary: number;
  bonus: number | null;
  equity: string | null;
  currency: string;
  start_date: string | null;
  expires_at: string | null;
  job_id: string;
  job_title: string;
  candidate_name: string;
  created_at: string;
};

// ---- Business Projects portfolio (19.14) ----
export type BusinessProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled' | string;

export type BusinessProject = {
  id: string;
  name: string;
  status: BusinessProjectStatus;
  project_type: string;
  progress_pct: number;
  start_date: string | null;
  target_end_date: string | null;
  total_budget: number;
  spent: number;
  budget_utilisation_pct: number;
  member_count: number;
};

export type BusinessProjectDetail = BusinessProject & {
  description?: string | null;
  currency?: string;
};

// ---- Workforce Planning (19.17) ----
export type WorkforcePlanStatus = 'draft' | 'active' | 'archived';

export type WorkforcePlan = {
  id: string;
  company_id: string;
  department_id: string | null;
  department_name: string | null;
  name: string;
  planning_period: string;
  current_headcount: number;
  target_headcount: number;
  status: WorkforcePlanStatus;
  ai_forecast_summary: string | null;
  created_at: string;
};

export type WorkforceScenarioType = 'baseline' | 'growth' | 'freeze' | 'reduction' | string;

export type WorkforceScenario = {
  id: string;
  name: string;
  scenario_type: WorkforceScenarioType;
  headcount_delta: number;
  cost_delta: number;
  assumptions: string[];
  projected_month: string | null;
  is_selected: boolean;
};

export type WorkforcePlanDetail = WorkforcePlan & { scenarios: WorkforceScenario[] };

export type WorkforcePlanInput = {
  department_id?: string;
  name: string;
  planning_period: string;
  current_headcount: number;
  target_headcount: number;
  status?: WorkforcePlanStatus;
};

export type WorkforceScenarioInput = {
  name: string;
  scenario_type: WorkforceScenarioType;
  headcount_delta: number;
  cost_delta: number;
  assumptions?: string[];
  projected_month?: string;
};
