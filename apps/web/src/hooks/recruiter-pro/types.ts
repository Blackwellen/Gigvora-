// Domain 21 (Recruiter Pro) shared types. Field names are snake_case to
// mirror the API contract (mirrors the Domain 20 convention in
// src/hooks/recruiter/types.ts). Pro-tier gating reuses RecruiterSeat from
// Domain 20 (src/hooks/recruiter/types.ts) — tier === 'pro'.

export type SeverityLevel = 'info' | 'warning' | 'critical';

// ---------------------------------------------------------------------------
// 21.01 Recruiter Pro home
// ---------------------------------------------------------------------------

export type RecruiterProHome = {
  kpis: {
    active_pipeline_count: number;
    campaigns_running: number;
    sequences_active: number;
    alerts_unread: number;
  };
  recent_collaboration: Array<{
    id: string;
    event_type: CollaborationEventType;
    actor_name: string;
    actor_avatar_url: string | null;
    summary: string;
    created_at: string;
  }>;
};

// ---------------------------------------------------------------------------
// 21.02 Advanced candidate search
// ---------------------------------------------------------------------------

export type BooleanClauseField = 'keyword' | 'skill' | 'title' | 'location';
export type BooleanOperator = 'AND' | 'OR' | 'NOT';

export type BooleanClause = {
  id: string;
  field: BooleanClauseField;
  value: string;
  operator: BooleanOperator;
};

export type BooleanClauseGroup = {
  id: string;
  clauses: BooleanClause[];
};

export type AdvancedSearchResult = {
  id: string;
  name: string;
  headline: string | null;
  location: string | null;
  skills: string[];
  avatar_url: string | null;
  match_score: number | null;
  open_to_work: boolean;
};

export type SavedQueryGroup = {
  id: string;
  name: string;
  groups: BooleanClauseGroup[];
  semantic_expansion: boolean;
  created_at: string;
  last_run_at: string | null;
};

// ---------------------------------------------------------------------------
// 21.03 AI candidate matching
// ---------------------------------------------------------------------------

export type MatchDecisionStatus = 'approved' | 'rejected' | 'pending';

export type AiCandidateMatch = {
  id: string;
  candidate_id: string;
  candidate_name: string;
  candidate_headline: string | null;
  candidate_avatar_url: string | null;
  job_id: string | null;
  project_id: string | null;
  match_score: number;
  confidence: 'low' | 'medium' | 'high';
  why_match: string[];
  decision_status: MatchDecisionStatus;
  decided_by: string | null;
  decided_at: string | null;
  created_at: string;
};

// ---------------------------------------------------------------------------
// 21.04 Pipeline
// ---------------------------------------------------------------------------

export type PipelineStage = {
  id: string;
  key: string;
  name: string;
  order: number;
  wip_limit: number | null;
};

export type PipelineCandidate = {
  id: string;
  candidate_id: string;
  candidate_name: string;
  candidate_avatar_url: string | null;
  stage_id: string;
  sla_breached: boolean;
  ats_synced: boolean;
  moved_at: string;
  added_at: string;
};

export type PipelineBoard = {
  project_id: string;
  stages: PipelineStage[];
  candidates: PipelineCandidate[];
};

export type PipelineMoveEvent = {
  project_id: string;
  candidate_id: string;
  from_stage_id: string;
  to_stage_id: string;
  moved_by_name: string;
};

// ---------------------------------------------------------------------------
// 21.05 Recruiter projects (merged standard + pro)
// ---------------------------------------------------------------------------

export type ProjectAutomationStatus = {
  project_id: string;
  automation_enabled: boolean;
  active_sequences: number;
  last_run_at: string | null;
};

export type ProjectSlaBreach = {
  id: string;
  project_id: string;
  candidate_name: string;
  stage_name: string;
  breached_since: string;
};

export type ProjectAtsSync = {
  project_id: string;
  provider: 'greenhouse' | 'lever' | null;
  status: 'synced' | 'syncing' | 'error' | 'not_connected';
  last_synced_at: string | null;
};

// ---------------------------------------------------------------------------
// 21.06 Bulk outreach
// ---------------------------------------------------------------------------

export type OutreachChannel = 'email' | 'linkedin';

export type BulkOutreachVariant = {
  id: string;
  label: string;
  template_id: string | null;
  subject: string;
  body: string;
  split_pct: number;
};

export type BulkOutreachCampaign = {
  id: string;
  name: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused';
  channel: OutreachChannel;
  audience_count: number;
  variants: BulkOutreachVariant[];
  scheduled_at: string | null;
  sent_count: number;
  reply_count: number;
  created_at: string;
};

// ---------------------------------------------------------------------------
// 21.07 Outreach templates
// ---------------------------------------------------------------------------

export type OutreachTemplate = {
  id: string;
  name: string;
  channel: OutreachChannel;
  subject: string | null;
  body: string;
  usage_count: number;
  created_at: string;
  updated_at: string;
};

// ---------------------------------------------------------------------------
// 21.08 Sequences
// ---------------------------------------------------------------------------

export type SequenceStepType = 'email' | 'linkedin' | 'wait' | 'branch';

export type SequenceStep = {
  id: string;
  step_order: number;
  type: SequenceStepType;
  subject?: string | null;
  body?: string | null;
  template_id: string | null;
  wait_days: number | null;
  branch_condition: string | null;
};

export type Sequence = {
  id: string;
  name: string;
  description?: string | null;
  status: 'draft' | 'active' | 'paused' | 'archived';
  steps: SequenceStep[];
  enrollment_count: number;
  completed_count?: number;
  created_at: string;
};

export type SequenceEnrollment = {
  id: string;
  sequence_id: string;
  candidate_id: string | null;
  candidate_name: string;
  candidate_email?: string | null;
  current_step_order: number;
  total_steps: number;
  status: 'active' | 'completed' | 'exited' | 'paused';
  enrolled_at: string;
};

// ---------------------------------------------------------------------------
// 21.09 Team collaboration
// ---------------------------------------------------------------------------

export type CollaborationEventType = 'comment' | 'mention' | 'stage_move' | 'assignment' | 'note' | 'status_change';

export type CollaborationEvent = {
  id: string;
  project_id: string | null;
  project_name: string | null;
  event_type: CollaborationEventType;
  actor_id: string;
  actor_name: string;
  actor_avatar_url: string | null;
  body: string;
  created_at: string;
};

// ---------------------------------------------------------------------------
// 21.10 Candidate activity
// ---------------------------------------------------------------------------

export type CandidateActivityEvent = {
  id: string;
  source: 'outreach' | 'collaboration' | 'pipeline';
  event_type: string;
  channel: OutreachChannel | null;
  actor_name: string | null;
  summary: string;
  created_at: string;
};

// ---------------------------------------------------------------------------
// 21.11 Advanced alerts
// ---------------------------------------------------------------------------

export type AdvancedAlert = {
  id: string;
  severity: SeverityLevel;
  title: string;
  description: string;
  source: string;
  is_read: boolean;
  is_resolved: boolean;
  created_at: string;
};

// ---------------------------------------------------------------------------
// 21.12 Recruiter Pro analytics
// ---------------------------------------------------------------------------

export type RecruiterProAnalytics = {
  kpis: {
    active_campaigns: number;
    avg_reply_rate_pct: number;
    avg_sequence_completion_pct: number;
    candidates_in_pipeline: number;
  };
  pipeline_by_stage: Array<{ stage_name: string; count: number }>;
  campaign_reply_rates: Array<{ campaign_name: string; reply_rate_pct: number }>;
  sequence_completion_rates: Array<{ sequence_name: string; completion_pct: number }>;
  top_templates: Array<{ template_name: string; usage_count: number; reply_rate_pct: number }>;
};

// ---------------------------------------------------------------------------
// 21.13 ATS integrations
// ---------------------------------------------------------------------------

export type AtsProvider = 'greenhouse' | 'lever' | 'workday' | 'bamboohr' | 'icims';

export type AtsConnection = {
  id: string;
  provider: AtsProvider;
  status: 'connected' | 'pending' | 'error' | 'not_connected';
  health: 'healthy' | 'degraded' | 'down';
  external_account_name?: string | null;
  sync_frequency_minutes?: number;
  connected_at: string | null;
  last_sync_at: string | null;
};

export type AtsFieldMapping = {
  id: string;
  connection_id: string;
  source_field: string;
  target_field: string;
  entity_type?: 'candidate' | 'job' | 'application' | 'interview';
  is_required: boolean;
};

export type AtsSyncEvent = {
  id: string;
  sync_run_id: string;
  level: 'info' | 'warning' | 'error';
  message: string;
  created_at: string;
};

export type AtsSyncRun = {
  id: string;
  connection_id: string;
  status: 'success' | 'partial' | 'failed' | 'running';
  records_synced: number;
  records_failed?: number;
  error_summary?: string | null;
  started_at: string;
  finished_at: string | null;
  events?: AtsSyncEvent[];
};
