// Backed by /jobs, /applications, /screening — apps/api/src/modules/{jobs,applications,screening}.
// Domain 16 (Jobs Marketplace, Applications & Candidate Journey).
//
// These modules are thin (bare `db(TABLE)` reads/writes per the build contract), so — unlike the
// pm-projects domain, which camelCases in its service layer — payloads here mirror the real Postgres
// column names (snake_case) exactly: job_id/applicant_id, work_mode, salary_min, etc.

export type JobEmploymentType = 'full_time' | 'part_time' | 'contract' | 'internship' | 'temporary';
export type JobWorkMode = 'onsite' | 'remote' | 'hybrid';
export type JobStatus = 'draft' | 'open' | 'closed' | 'archived';
export type JobSeniority = 'entry' | 'mid' | 'senior' | 'lead' | 'principal' | 'executive';

export type Job = {
  id: string;
  company_id: string | null;
  posted_by: string;
  title: string;
  description: string;
  requirements: string[] | null;
  location: string | null;
  country_code?: string | null;
  employment_type: JobEmploymentType;
  work_mode: JobWorkMode;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  status: JobStatus;
  skills: string[] | null;
  slug?: string | null;
  seniority?: JobSeniority | null;
  category?: string | null;
  application_deadline?: string | null;
  headcount?: number | null;
  published_at?: string | null;
  expires_at?: string | null;
  created_at: string;
  updated_at: string;
  // Detail-view enrichments the API includes when present (company join, counts).
  company_name?: string | null;
  company_logo_url?: string | null;
  applicant_count?: number;
  screening_question_count?: number;
  // List-view enrichments: recommended jobs carry a match_score (GET /jobs/recommended),
  // saved/browsed jobs carry is_saved, owner-scoped views carry is_owner.
  match_score?: number | null;
  match_reasons?: string[];
  is_saved?: boolean;
  is_owner?: boolean;
};

export type JobInput = {
  title: string;
  description: string;
  requirements?: string[];
  location?: string;
  country_code?: string;
  employment_type: JobEmploymentType;
  work_mode: JobWorkMode;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  skills?: string[];
  status?: JobStatus;
  seniority?: JobSeniority;
  category?: string;
  application_deadline?: string;
  headcount?: number;
};

export type ScreeningQuestionType = 'text' | 'yes_no' | 'multiple_choice' | 'numeric';

export type ScreeningQuestion = {
  id: string;
  job_id: string;
  question_text: string;
  question_type: ScreeningQuestionType;
  is_knockout: boolean;
  options: string[] | null;
  order_index: number;
};

export type ScreeningQuestionInput = {
  question_text: string;
  question_type: ScreeningQuestionType;
  is_knockout?: boolean;
  options?: string[];
  order_index?: number;
};

export type ApplicationStatus =
  | 'submitted'
  | 'reviewing'
  | 'shortlisted'
  | 'interviewing'
  | 'offered'
  | 'hired'
  | 'rejected'
  | 'withdrawn';

export type ApplicationCandidate = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url?: string | null;
  headline?: string | null;
  email?: string | null;
};

export type ApplicationAnswer = {
  id: string;
  question_id: string | null;
  question_text?: string;
  answer_text: string;
};

export type StageTimelineEvent = {
  id: string;
  label: string;
  status: ApplicationStatus | string;
  occurred_at: string;
  note?: string;
};

export type Application = {
  id: string;
  job_id: string;
  applicant_id: string;
  resume_url: string | null;
  cover_letter: string | null;
  status: ApplicationStatus;
  match_score: number | null;
  ml_insights: Record<string, unknown> | null;
  source?: string | null;
  applied_at?: string | null;
  created_at: string;
  updated_at: string;
  candidate?: ApplicationCandidate;
  job?: Pick<Job, 'id' | 'title' | 'company_id' | 'company_name' | 'location' | 'employment_type' | 'work_mode' | 'status'>;
  // application-detail (16.11) enrichments: answers to job_screening_questions, a derived
  // stage timeline (status + screening_reviews/interviews/offers timestamps), and refs to
  // the current interview/offer so the hub page can deep-link into them.
  answers?: ApplicationAnswer[];
  timeline?: StageTimelineEvent[];
  current_interview_id?: string | null;
  current_offer_id?: string | null;
  // UI affordance only (never the auth boundary — the server still 403s the mutating
  // routes) so ApplicationShell can hide stage-change actions from non-owners.
  is_job_owner?: boolean;
};

// ---- Screening queue (16.12 — job-scoped review workbench) ----
export type ScreeningQueueItem = {
  id: string;
  application_id: string;
  candidate_name: string;
  candidate_avatar_url?: string | null;
  auto_score: number | null;
  match_score: number | null;
  status: ApplicationStatus;
  applied_at: string;
};

export type ScreeningDecision = 'pass' | 'reject' | 'advance';

// ---- Assessments (16.13) ----
export type AssessmentTemplate = {
  id: string;
  job_id: string;
  title: string;
  description?: string | null;
  assessment_type?: string | null;
  passing_score?: number | null;
  time_limit_minutes?: number | null;
};

export type AssessmentAssignmentStatus = 'assigned' | 'in_progress' | 'submitted' | 'expired';

export type AssessmentResult = {
  id: string;
  assignment_id: string;
  score: number;
  breakdown: Record<string, unknown> | null;
  passed: boolean;
  submitted_at?: string | null;
  reviewed_by?: string | null;
  reviewer_note?: string | null;
};

export type AssessmentAssignment = {
  id: string;
  assessment_id: string;
  application_id: string;
  status: AssessmentAssignmentStatus;
  assigned_at: string;
  due_at?: string | null;
  assessment?: AssessmentTemplate;
  result?: AssessmentResult | null;
};

// ---- Interviews (16.14) ----
export type InterviewType = 'phone_screen' | 'technical' | 'onsite' | 'panel' | 'final';
export type InterviewStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';
export type InterviewRecommendation = 'strong_yes' | 'yes' | 'neutral' | 'no' | 'strong_no';

export type InterviewFeedbackRow = {
  id?: string;
  criterion: string;
  rating: number;
  comments?: string;
};

export type InterviewScorecard = {
  id: string;
  interview_id: string;
  interviewer_id: string;
  interviewer_name?: string;
  overall_rating: number;
  recommendation: InterviewRecommendation;
  submitted_at: string;
  feedback: InterviewFeedbackRow[];
};

export type Interview = {
  id: string;
  application_id: string;
  job_id: string;
  type: InterviewType;
  scheduled_at: string;
  duration_minutes: number;
  location_or_link?: string | null;
  status: InterviewStatus;
  round_number?: number;
  interviewers?: Array<{ id: string; name: string }>;
  scorecards?: InterviewScorecard[];
};

// ---- Offers (16.15) ----
export type OfferStatus = 'draft' | 'sent' | 'negotiating' | 'accepted' | 'declined' | 'rescinded' | 'expired';
export type ApprovalDecision = 'pending' | 'approved' | 'rejected';

export type OfferVersion = {
  id: string;
  offer_id: string;
  version_number: number;
  changes: Record<string, unknown>;
  created_by?: string;
  created_at: string;
};

export type OfferApproval = {
  id: string;
  offer_id: string;
  approver_id: string;
  approver_name?: string;
  decision: ApprovalDecision;
  notes?: string;
  updated_at?: string;
};

export type Offer = {
  id: string;
  application_id: string;
  job_id: string;
  base_salary: number;
  bonus?: number | null;
  equity?: string | null;
  currency: string;
  start_date?: string | null;
  status: OfferStatus;
  created_by?: string;
  expires_at?: string | null;
  versions?: OfferVersion[];
  approvals?: OfferApproval[];
};

// ---- Hire handoff (16.18) ----
export type HireHandoffStatus = 'pending' | 'in_progress' | 'completed';

export type HireHandoffChecklistItem = {
  key: string;
  label: string;
  done: boolean;
};

export type HireHandoff = {
  id: string;
  application_id: string;
  job_id: string;
  candidate_id: string;
  status: HireHandoffStatus;
  start_date?: string | null;
  onboarding_owner_id?: string | null;
  onboarding_owner_name?: string;
  checklist: HireHandoffChecklistItem[];
  notes?: string | null;
};

export type ApplicationAnswerInput = {
  question_id?: string;
  answer_text: string;
};

export type ApplicationInput = {
  job_id: string;
  resume_url?: string;
  cover_letter?: string;
  answers?: ApplicationAnswerInput[];
};

export const APPLICATION_STAGE_LABEL: Record<ApplicationStatus, string> = {
  submitted: 'Applied',
  reviewing: 'Screening',
  shortlisted: 'Shortlisted',
  interviewing: 'Interview',
  offered: 'Offer',
  hired: 'Hired',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

// ---- Jobs Home / Search / Recommended / Saved / Alerts / Analytics (16.01-16.05, 16.16) ----

export type JobListMeta = { total: number };

export type JobAlertFrequency = 'daily' | 'weekly' | 'instant';

export type JobAlert = {
  id: string;
  user_id: string;
  keywords: string | null;
  location: string | null;
  remote: JobWorkMode | null;
  employment_type: JobEmploymentType | null;
  category: string | null;
  salary_min: number | null;
  frequency: JobAlertFrequency;
  is_active: boolean;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
};

export type JobAlertInput = {
  keywords?: string;
  location?: string;
  remote?: JobWorkMode;
  employment_type?: JobEmploymentType;
  category?: string;
  salary_min?: number;
  frequency: JobAlertFrequency;
  is_active?: boolean;
};

export type JobAnalytics = {
  funnel: {
    viewed: number;
    applied: number;
    screened: number;
    interviewed: number;
    offered: number;
    hired: number;
  };
  sourceBreakdown: Array<{ source: string; count: number }>;
  timeToFillDays: number | null;
  applicantQuality: {
    avgMatchScore: number | null;
    qualifiedPct: number | null;
  };
};
