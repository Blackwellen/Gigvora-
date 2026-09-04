// Shared types for Domain 24 (CRM, Leads, Accounts & Relationship Operations).
// Response fields are snake_case, mirroring the API contract exactly (raw
// knex rows) — do not camelCase these. Input/body types use the camelCase
// keys the controllers/services expect on write (see each module's
// WRITABLE_FIELDS map in apps/api/src/modules/crm/*.service.js).

export type CrmOwnerType = 'user' | 'company';

export type CrmPaginated<T> = { data: T[]; meta: { total: number } };

// ---- AI / ML scoring (shared shape across every capability) ----
export type CrmScoreFactor = { factor: string; points: number };
export type CrmScoreExplanation = { summary: string; factors: CrmScoreFactor[] };
export type CrmScoreResult = {
  score: number;
  confidence: number;
  explanation: CrmScoreExplanation;
  features: Record<string, unknown>;
};

export type CrmMlCapability = 'lead_fit' | 'lead_intent' | 'opportunity_close' | 'relationship_health' | 'duplicate_match' | 'next_best_action';

export type CrmMlPrediction = {
  id: string;
  owner_type: CrmOwnerType;
  owner_id: string;
  workspace_id: string | null;
  object_type: 'contact' | 'lead' | 'account' | 'opportunity';
  object_id: string;
  capability: CrmMlCapability;
  model_name: string;
  model_version: string;
  score: number;
  confidence: number | null;
  input_feature_snapshot_hash: string | null;
  explanation_jsonb: CrmScoreExplanation;
  generated_at: string;
  expires_at: string | null;
  override_value: number | null;
  override_actor_id: string | null;
  override_reason: string | null;
};

export type CrmNextBestAction = { action: string; reason: string };

// ---- Accounts (24.05) ----
export type CrmAccountTier = 'strategic' | 'key' | 'standard' | 'prospect';
export type CrmAccountLifecycleStage = 'prospect' | 'active' | 'customer' | 'churned';
export type CrmEnrichmentStatus = 'none' | 'queued' | 'processing' | 'completed' | 'review_required' | 'failed';
export type CrmCanonicalMatchStatus = 'unmatched' | 'suggested' | 'linked';

export type CrmAccount = {
  id: string;
  owner_type: CrmOwnerType;
  owner_id: string;
  workspace_id: string | null;
  organisation_id: string | null;
  name: string;
  legal_name: string | null;
  domain: string | null;
  website: string | null;
  logo_url: string | null;
  description: string | null;
  industry: string | null;
  employee_band: string | null;
  revenue_band: string | null;
  currency: string;
  founded_year: number | null;
  headquarters_location: string | null;
  country_code: string | null;
  account_tier: CrmAccountTier;
  lifecycle_stage: CrmAccountLifecycleStage;
  owner_user_id: string | null;
  relationship_health_score: number | null;
  engagement_score: number | null;
  open_pipeline_value: number;
  won_revenue: number;
  first_interaction_at: string | null;
  last_interaction_at: string | null;
  next_followup_at: string | null;
  enrichment_status: CrmEnrichmentStatus;
  canonical_match_status: CrmCanonicalMatchStatus;
  technology_jsonb: string[];
  social_links_jsonb: Record<string, string>;
  tags: string[];
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CrmAccountsFilter = {
  industry?: string;
  employeeBand?: string;
  accountTier?: CrmAccountTier;
  relationshipHealthMin?: number;
  ownerUserId?: string;
  search?: string;
  includeArchived?: boolean;
  limit?: number;
  offset?: number;
};

export type CrmAccountInput = Partial<{
  name: string;
  legalName: string;
  domain: string;
  website: string;
  logoUrl: string;
  description: string;
  industry: string;
  employeeBand: string;
  revenueBand: string;
  currency: string;
  foundedYear: number;
  headquartersLocation: string;
  countryCode: string;
  accountTier: CrmAccountTier;
  lifecycleStage: CrmAccountLifecycleStage;
  ownerUserId: string;
  organisationId: string;
  technologyJsonb: string[];
  socialLinksJsonb: Record<string, string>;
  tags: string[];
}>;

export type CrmAccountRelated = {
  account: CrmAccount;
  contacts: CrmContact[];
  opportunities: CrmOpportunity[];
  activities: CrmActivity[];
};

export type CrmBuyingRole = 'champion' | 'decision_maker' | 'influencer' | 'user' | 'procurement' | 'blocker';

export type CrmAccountContactRole = {
  id: string;
  account_id: string;
  contact_id: string;
  relationship_type: string | null;
  job_title_at_account: string | null;
  department: string | null;
  seniority: string | null;
  is_primary: boolean;
  started_at: string | null;
  ended_at: string | null;
  buying_role: CrmBuyingRole | null;
  influence_level: string | null;
  relationship_strength: string | null;
  created_at: string;
  updated_at: string;
};

export type CrmAccountContactRoleInput = Partial<{
  contactId: string;
  relationshipType: string;
  jobTitleAtAccount: string;
  department: string;
  seniority: string;
  isPrimary: boolean;
  startedAt: string;
  endedAt: string;
  buyingRole: CrmBuyingRole;
  influenceLevel: string;
  relationshipStrength: string;
}>;

export type CrmBuyingGroupMember = CrmAccountContactRole & {
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  job_title: string | null;
  email_normalized: string | null;
  avatar_url: string | null;
};

// ---- Contacts (24.02) ----
export type CrmContactLifecycleStage = 'lead' | 'contact' | 'customer';
export type CrmConsentStatus = 'unknown' | 'granted' | 'withdrawn';

export type CrmContactEmail = { value: string; primary?: boolean; type?: string };
export type CrmContactPhone = { value: string; primary?: boolean; type?: string };

export type CrmContact = {
  id: string;
  owner_type: CrmOwnerType;
  owner_id: string;
  workspace_id: string | null;
  professional_id: string | null;
  account_id: string | null;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  job_title: string | null;
  department: string | null;
  seniority: string | null;
  emails_jsonb: CrmContactEmail[];
  email_normalized: string | null;
  phones_jsonb: CrmContactPhone[];
  phone_normalized: string | null;
  location_text: string | null;
  country_code: string | null;
  city: string | null;
  timezone: string | null;
  relationship_type: string | null;
  lifecycle_stage: CrmContactLifecycleStage;
  owner_user_id: string | null;
  source: string | null;
  source_detail: string | null;
  relationship_health_score: number | null;
  relationship_health_band: string | null;
  engagement_score: number | null;
  first_interaction_at: string | null;
  last_interaction_at: string | null;
  next_followup_at: string | null;
  interaction_count: number;
  preferred_channel: string | null;
  avatar_url: string | null;
  enrichment_status: CrmEnrichmentStatus;
  enrichment_confidence: number | null;
  canonical_match_status: CrmCanonicalMatchStatus;
  consent_status: CrmConsentStatus;
  do_not_contact: boolean;
  tags: string[];
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CrmContactsFilter = {
  lifecycleStage?: CrmContactLifecycleStage;
  accountId?: string;
  ownerUserId?: string;
  relationshipType?: string;
  tag?: string;
  search?: string;
  includeArchived?: boolean;
  limit?: number;
  offset?: number;
};

export type CrmContactInput = Partial<{
  accountId: string;
  professionalId: string;
  firstName: string;
  lastName: string;
  displayName: string;
  jobTitle: string;
  department: string;
  seniority: string;
  emailsJsonb: CrmContactEmail[];
  phonesJsonb: CrmContactPhone[];
  locationText: string;
  countryCode: string;
  city: string;
  timezone: string;
  relationshipType: string;
  lifecycleStage: CrmContactLifecycleStage;
  ownerUserId: string;
  source: string;
  sourceDetail: string;
  preferredChannel: string;
  avatarUrl: string;
  consentStatus: CrmConsentStatus;
  doNotContact: boolean;
  nextFollowupAt: string;
  tags: string[];
  email: string;
  phone: string;
}>;

export type CrmContactDuplicateSearchParams = { email?: string; phone?: string; firstName?: string; lastName?: string };

// ---- Leads (24.03) ----
export type CrmLeadStatus = 'new' | 'working' | 'qualified' | 'nurture' | 'converted' | 'disqualified';
export type CrmLeadTemperature = 'cold' | 'warm' | 'hot';

export type CrmLead = {
  id: string;
  owner_type: CrmOwnerType;
  owner_id: string;
  workspace_id: string | null;
  contact_id: string | null;
  account_id: string | null;
  professional_id: string | null;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  email_normalized: string | null;
  phone_normalized: string | null;
  job_title: string | null;
  company_name: string | null;
  location: string | null;
  lead_status: CrmLeadStatus;
  lead_source: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer: string | null;
  owner_user_id: string | null;
  fit_score: number | null;
  intent_score: number | null;
  engagement_score: number | null;
  qualification_score: number | null;
  buying_role_prediction: string | null;
  lead_temperature: CrmLeadTemperature;
  last_activity_at: string | null;
  next_followup_at: string | null;
  enrichment_status: CrmEnrichmentStatus;
  duplicate_risk_score: number | null;
  converted_at: string | null;
  converted_contact_id: string | null;
  converted_account_id: string | null;
  converted_opportunity_id: string | null;
  disqualified_at: string | null;
  disqualification_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type CrmLeadsFilter = {
  leadStatus?: CrmLeadStatus;
  leadSource?: string;
  ownerUserId?: string;
  fitScoreMin?: number;
  fitScoreMax?: number;
  intentScoreMin?: number;
  intentScoreMax?: number;
  search?: string;
  limit?: number;
  offset?: number;
};

export type CrmLeadInput = Partial<{
  contactId: string;
  accountId: string;
  professionalId: string;
  firstName: string;
  lastName: string;
  displayName: string;
  jobTitle: string;
  companyName: string;
  location: string;
  leadStatus: CrmLeadStatus;
  leadSource: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  referrer: string;
  ownerUserId: string;
  leadTemperature: CrmLeadTemperature;
  nextFollowupAt: string;
  email: string;
  phone: string;
}>;

export type CrmLeadConvertInput = { createOpportunity?: boolean; opportunityName?: string; value?: number };
export type CrmLeadConvertResult = { lead: CrmLead; contact: CrmContact | null; account: CrmAccount | null; opportunity: CrmOpportunity | null };
export type CrmLeadDisqualifyInput = { reason?: string };

// ---- Pipeline stages (24.13 / 24.28) ----
export type CrmPipelineStage = {
  id: string;
  owner_type: CrmOwnerType;
  owner_id: string;
  workspace_id: string | null;
  key: string;
  label: string;
  order_index: number;
  is_won: boolean;
  is_lost: boolean;
  color: string;
  created_at: string;
  updated_at: string;
};

export type CrmPipelineStageReorderItem = { id: string; orderIndex: number };

// ---- Opportunities (24.28) ----
export type CrmForecastCategory = 'pipeline' | 'best_case' | 'commit' | 'closed';

export type CrmOpportunity = {
  id: string;
  owner_type: CrmOwnerType;
  owner_id: string;
  workspace_id: string | null;
  account_id: string;
  stage_id: string;
  owner_user_id: string | null;
  name: string;
  value: number;
  currency: string;
  probability: number;
  forecast_category: CrmForecastCategory;
  expected_close_date: string | null;
  actual_close_date: string | null;
  opportunity_type: string | null;
  source: string | null;
  product_service: string | null;
  primary_contact_id: string | null;
  champion_contact_id: string | null;
  decision_maker_contact_id: string | null;
  economic_buyer_contact_id: string | null;
  relationship_health_score: number | null;
  ai_close_score: number | null;
  ai_close_confidence: number | null;
  next_step: string | null;
  next_step_due_at: string | null;
  loss_reason: string | null;
  win_reason: string | null;
  board_order: number;
  closed_at: string | null;
  weighted_value: number;
  created_at: string;
  updated_at: string;
};

/** GET /opportunities/:id enriches the row with the joined stakeholder contacts. */
export type CrmOpportunityDetail = CrmOpportunity & {
  primaryContact: CrmContact | null;
  championContact: CrmContact | null;
  decisionMakerContact: CrmContact | null;
  economicBuyerContact: CrmContact | null;
};

export type CrmOpportunitiesFilter = {
  stageId?: string;
  ownerUserId?: string;
  accountId?: string;
  forecastCategory?: CrmForecastCategory;
  valueMin?: number;
  valueMax?: number;
  closeDateFrom?: string;
  closeDateTo?: string;
  search?: string;
  limit?: number;
  offset?: number;
};

export type CrmOpportunityInput = Partial<{
  accountId: string;
  stageId: string;
  ownerUserId: string;
  name: string;
  value: number;
  currency: string;
  probability: number;
  forecastCategory: CrmForecastCategory;
  expectedCloseDate: string;
  opportunityType: string;
  source: string;
  productService: string;
  primaryContactId: string;
  championContactId: string;
  decisionMakerContactId: string;
  economicBuyerContactId: string;
  nextStep: string;
  nextStepDueAt: string;
}>;

export type CrmOpportunityMoveInput = { stageId: string; boardOrder?: number };
export type CrmOpportunityCloseInput = { outcome: 'won' | 'lost'; reason?: string };

// ---- Activities (24.29 / 24.43 — shared timeline + audit trail) ----
export type CrmObjectType = 'contact' | 'lead' | 'account' | 'opportunity';
export type CrmActivityType = 'note' | 'email' | 'message' | 'call' | 'meeting' | 'file' | 'stage_change' | 'owner_change' | 'enrichment' | 'followup' | 'system_event';
export type CrmActivityDirection = 'inbound' | 'outbound' | 'internal';

export type CrmActivity = {
  id: string;
  owner_type: CrmOwnerType;
  owner_id: string;
  workspace_id: string | null;
  object_type: CrmObjectType;
  object_id: string;
  actor_id: string | null;
  activity_type: CrmActivityType;
  direction: CrmActivityDirection;
  subject: string | null;
  summary: string | null;
  occurred_at: string;
  metadata_jsonb: Record<string, unknown>;
  created_at: string;
};

export type CrmActivitiesFilter = { objectType?: CrmObjectType; objectId?: string; limit?: number; offset?: number };

export type CrmActivityInput = {
  objectType: CrmObjectType;
  objectId: string;
  activityType: CrmActivityType;
  direction?: CrmActivityDirection;
  subject?: string;
  summary?: string;
  occurredAt?: string;
  metadataJsonb?: Record<string, unknown>;
};

// ---- Follow-ups (24.21) ----
export type CrmFollowupType = 'call' | 'email' | 'message' | 'meeting' | 'check_in' | 'proposal' | 'contract' | 'relationship_touch' | 'custom';
export type CrmFollowupPriority = 'low' | 'medium' | 'high';
export type CrmFollowupStatus = 'open' | 'done' | 'snoozed';

export type CrmFollowup = {
  id: string;
  owner_type: CrmOwnerType;
  owner_id: string;
  workspace_id: string | null;
  object_type: CrmObjectType;
  object_id: string;
  type: CrmFollowupType;
  due_at: string;
  priority: CrmFollowupPriority;
  owner_user_id: string | null;
  status: CrmFollowupStatus;
  reason: string | null;
  ai_recommended: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CrmFollowupsFilter = {
  status?: CrmFollowupStatus;
  ownerUserId?: string;
  objectType?: CrmObjectType;
  objectId?: string;
  dueBefore?: string;
  dueAfter?: string;
  limit?: number;
  offset?: number;
};

export type CrmFollowupInput = Partial<{
  objectType: CrmObjectType;
  objectId: string;
  type: CrmFollowupType;
  dueAt: string;
  priority: CrmFollowupPriority;
  ownerUserId: string;
  reason: string;
  aiRecommended: boolean;
}>;

export type CrmFollowupSnoozeInput = { untilAt: string };

// ---- Segments (24.18 / 24.32) ----
export type CrmSegmentObjectType = 'contact' | 'lead' | 'account';
export type CrmSegmentType = 'dynamic' | 'static';
export type CrmSegmentRuleOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in';
export type CrmSegmentGroupLogic = 'and' | 'or';

export type CrmSegmentRule = {
  id: string;
  segment_id: string;
  field: string;
  operator: CrmSegmentRuleOperator;
  value: unknown;
  group_logic: CrmSegmentGroupLogic;
  group_index: number;
  order_index: number;
};

export type CrmSegmentRuleInput = {
  field: string;
  operator: CrmSegmentRuleOperator;
  value: unknown;
  groupLogic?: CrmSegmentGroupLogic;
  groupIndex?: number;
  orderIndex?: number;
};

export type CrmSegment = {
  id: string;
  owner_type: CrmOwnerType;
  owner_id: string;
  workspace_id: string | null;
  name: string;
  description: string | null;
  object_type: CrmSegmentObjectType;
  segment_type: CrmSegmentType;
  member_count_cached: number;
  owner_user_id: string | null;
  last_recalculated_at: string | null;
  created_at: string;
  updated_at: string;
  rules: CrmSegmentRule[];
};

export type CrmSegmentsFilter = { objectType?: CrmSegmentObjectType; limit?: number; offset?: number };

export type CrmSegmentInput = Partial<{
  name: string;
  description: string;
  objectType: CrmSegmentObjectType;
  segmentType: CrmSegmentType;
  ownerUserId: string;
  rules: CrmSegmentRuleInput[];
}>;

export type CrmSegmentPreviewInput = { objectType: CrmSegmentObjectType; rules: CrmSegmentRuleInput[] };
export type CrmSegmentPreviewResult = { count: number; sample: Array<CrmContact | CrmLead | CrmAccount> };

// ---- Saved views (24.32) ----
export type CrmSavedViewObjectType = 'contact' | 'lead' | 'account' | 'opportunity';
export type CrmSavedViewVisibility = 'private' | 'team' | 'workspace';

export type CrmSavedView = {
  id: string;
  owner_type: CrmOwnerType;
  owner_id: string;
  workspace_id: string | null;
  object_type: CrmSavedViewObjectType;
  owner_user_id: string;
  visibility: CrmSavedViewVisibility;
  name: string;
  filter_json: Record<string, unknown>;
  sort_json: { key?: string; direction?: 'asc' | 'desc' } | Record<string, unknown>;
  column_json: string[];
  view_mode: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export type CrmSavedViewsFilter = { objectType?: CrmSavedViewObjectType; limit?: number; offset?: number };

export type CrmSavedViewInput = Partial<{
  name: string;
  objectType: CrmSavedViewObjectType;
  visibility: CrmSavedViewVisibility;
  filterJson: Record<string, unknown>;
  sortJson: Record<string, unknown>;
  columnJson: string[];
  viewMode: string;
  isDefault: boolean;
}>;

// ---- Duplicates (24.31) ----
export type CrmDuplicateObjectType = 'contact' | 'lead' | 'account';
export type CrmDuplicateResolutionStatus = 'pending' | 'merged' | 'kept_separate' | 'linked' | 'ignored';
export type CrmDuplicateResolutionAction = 'merge' | 'kept_separate' | 'linked' | 'ignored';

export type CrmDuplicateCandidate = {
  id: string;
  owner_type: CrmOwnerType;
  owner_id: string;
  workspace_id: string | null;
  object_type: CrmDuplicateObjectType;
  record_a_id: string;
  record_b_id: string;
  match_score: number;
  match_features_jsonb: CrmScoreExplanation;
  model_version: string;
  resolution_status: CrmDuplicateResolutionStatus;
  resolved_by: string | null;
  resolution_action: CrmDuplicateResolutionAction | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CrmDuplicatesFilter = { objectType?: CrmDuplicateObjectType; status?: CrmDuplicateResolutionStatus; limit?: number; offset?: number };

export type CrmDuplicateResolveInput = { action: CrmDuplicateResolutionAction; mergeInto?: string };

// ---- Imports (24.19) ----
export type CrmImportJobStatus = 'uploaded' | 'mapping' | 'validating' | 'reviewing' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type CrmImportRowStatus = 'pending' | 'matched' | 'created' | 'updated' | 'skipped' | 'failed';

export type CrmImportJob = {
  id: string;
  owner_type: CrmOwnerType;
  owner_id: string;
  workspace_id: string | null;
  created_by: string | null;
  source: string;
  file_name: string | null;
  object_key: string | null;
  file_size_bytes: number | null;
  field_mapping_jsonb: Record<string, string>;
  ownership_defaults_jsonb: Record<string, unknown>;
  status: CrmImportJobStatus;
  total_rows: number;
  created_count: number;
  updated_count: number;
  skipped_count: number;
  failed_count: number;
  duplicate_count: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CrmImportRow = {
  id: string;
  import_job_id: string;
  row_number: number;
  raw_jsonb: Record<string, unknown>;
  status: CrmImportRowStatus;
  match_type: string | null;
  error_message: string | null;
  created_record_id: string | null;
  created_at: string;
  updated_at: string;
};

export type CrmImportJobInput = {
  source?: string;
  fileName?: string;
  objectKey?: string;
  fileSizeBytes?: number;
  fieldMappingJsonb?: Record<string, string>;
  ownershipDefaultsJsonb?: Record<string, unknown>;
};

export type CrmImportRowsFilter = { status?: CrmImportRowStatus; limit?: number; offset?: number };

// ---- Analytics (24.40+ read-only aggregates) ----
export type CrmAnalyticsOverview = {
  contactCount: number;
  leadCount: number;
  accountCount: number;
  openOpportunityCount: number;
  openPipelineValue: number;
  wonThisMonth: number;
  wonValueThisMonth: number;
  overdueFollowups: number;
};

export type CrmPipelineFunnelBucket = {
  stageId: string;
  label: string;
  orderIndex: number;
  isWon: boolean;
  isLost: boolean;
  count: number;
  value: number;
};

export type CrmWinLossTrendPoint = { month: string; wonCount: number; wonValue: number; lostCount: number; lostValue: number };

export type CrmLeadSourceBreakdown = { leadSource: string; total: number; converted: number; conversionRate: number };

export type CrmTopAccount = { id: string; name: string; account_tier: CrmAccountTier; relationship_health_score: number | null; open_value: number; open_count: number };

export type CrmStalePipelineOpportunity = CrmOpportunity & { staleDays: number };

export type CrmWinLossTrendParams = { months?: number };
export type CrmTopAccountsParams = { limit?: number };
export type CrmStalePipelineParams = { staleDays?: number };

// Re-export for callers that want one entity object (used by generic components like CrmEntityCell/ScoreRing wrappers).
export type CrmEntity = CrmAccount | CrmContact | CrmLead | CrmOpportunity;
