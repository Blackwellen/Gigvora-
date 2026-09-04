export type VerificationStatus =
  | 'not_started' | 'draft' | 'submitted' | 'processing' | 'action_required'
  | 'needs_review' | 'verified' | 'partially_verified' | 'rejected' | 'expired' | 'revoked' | 'cancelled';

export type VerificationType = 'identity' | 'professional' | 'business' | 'qualification' | 'employment' | 'email' | 'phone';

export interface VerificationOverviewItem {
  id: string | null;
  verificationType: VerificationType;
  status: VerificationStatus;
  method?: string | null;
  submittedAt?: string | null;
  verifiedAt?: string | null;
  expiresAt?: string | null;
  reasonCode?: string | null;
}

export interface TrustOverview {
  verifications: VerificationOverviewItem[];
  reputation: {
    reviewCount: number;
    verifiedReviewCount: number;
    ratingAverage: number | null;
    ratingDistribution: Record<string, number>;
    recommendationCount: number;
    endorsementCount: number;
    completedTransactionCount: number;
    disputeRate: number | null;
  };
  signals: Array<{ key: string; type: string; value: unknown; confidence: number | null; computedAt: string; validUntil: string | null }>;
  safety: { openCases: number; reportsSubmitted: number; blockedAccounts: number };
}

export interface ReviewItem {
  id: string;
  subjectProfileId: string;
  reviewer: { id: string; name: string; avatarUrl: string | null } | null;
  contextType: string;
  contextId: string;
  overallRating: number;
  reviewText: string | null;
  status: string;
  isVerified: boolean;
  helpfulCount: number;
  notHelpfulCount: number;
  editedAt: string | null;
  version: number;
  aspectRatings: Array<{ dimension: string; score: number }>;
  response: { id: string; response_text: string } | null;
  createdAt: string;
}

export interface EligibleInteraction {
  contextType: string;
  contextId: string;
  label: string;
  completedAt: string | null;
  subjectProfileId: string;
}

export interface RecommendationItem {
  id: string;
  subjectProfileId: string;
  subjectUserId: string | null;
  author: { id: string; name: string; avatarUrl: string | null; headline: string | null } | null;
  relationshipType: string;
  body: string;
  visibility: string;
  verificationStatus: string;
  status: string;
  createdAt: string;
}

export interface EndorsementSkillBucket {
  skillId: string;
  skillName: string;
  endorsementCount: number;
  verifiedCount: number;
  endorserIds: string[];
}

export interface ReportReason {
  code: string;
  parent_code: string | null;
  label: string;
  description: string | null;
}

export interface SafetyCase {
  id: string;
  case_number: string;
  case_type: string;
  policy_category: string | null;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: string;
  subject_type: string;
  subject_id: string;
  assignee_id: string | null;
  team: string | null;
  risk_score: number | null;
  reportCount?: number;
  created_at: string;
  updated_at: string;
}

export interface Appeal {
  id: string;
  appeal_number: string;
  case_id: string | null;
  decision_id: string | null;
  appellant_id: string;
  reason: string;
  status: string;
  submitted_at: string;
  outcome: string | null;
  outcome_reason: string | null;
}
