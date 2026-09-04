'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  TrustOverview, ReviewItem, EligibleInteraction, RecommendationItem, EndorsementSkillBucket,
  ReportReason, SafetyCase, Appeal, VerificationOverviewItem,
} from './types';

// --- Trust overview / reputation ------------------------------------------------------------
export function useTrustOverviewMe() {
  return useQuery({
    queryKey: ['trust', 'overview', 'me'],
    queryFn: async () => (await api.get<{ data: TrustOverview }>('/trust/overview/me')).data.data,
  });
}

export function useTrustOverview(subjectType: string, subjectId: string | undefined) {
  return useQuery({
    queryKey: ['trust', 'overview', subjectType, subjectId],
    queryFn: async () => (await api.get<{ data: TrustOverview }>(`/trust/overview/${subjectType}/${subjectId}`)).data.data,
    enabled: Boolean(subjectId),
  });
}

// --- Reviews ---------------------------------------------------------------------------------
export function useReviews(mode: 'received' | 'written', opts?: { rating?: number; sort?: string }) {
  return useQuery({
    queryKey: ['trust', 'reviews', mode, opts],
    queryFn: async () => (await api.get<{ data: ReviewItem[]; pageInfo: { hasMore: boolean; nextCursor: string | null } }>('/trust/reviews', { params: { mode, ...opts } })).data,
  });
}

export function useEligibleInteractions() {
  return useQuery({
    queryKey: ['trust', 'reviews', 'eligible'],
    queryFn: async () => (await api.get<{ data: EligibleInteraction[] }>('/trust/reviews/eligible')).data.data,
  });
}

export function useSubmitReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      contextType: string; contextId: string; subjectProfileId: string; overallRating: number;
      reviewText?: string; aspectRatings?: Array<{ dimension: string; score: number }>;
    }) => (await api.post<{ data: ReviewItem }>('/trust/reviews', payload)).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trust', 'reviews'] }),
  });
}

export function useVoteHelpful() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ reviewId, isHelpful }: { reviewId: string; isHelpful: boolean }) =>
      (await api.post(`/trust/reviews/${reviewId}/helpful`, { isHelpful })).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trust', 'reviews'] }),
  });
}

export function useRespondToReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ reviewId, responseText }: { reviewId: string; responseText: string }) =>
      (await api.post(`/trust/reviews/${reviewId}/respond`, { responseText })).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trust', 'reviews'] }),
  });
}

// --- Recommendations ---------------------------------------------------------------------------
export function useRecommendations(mode: 'received' | 'given') {
  return useQuery({
    queryKey: ['trust', 'recommendations', mode],
    queryFn: async () => (await api.get<{ data: RecommendationItem[] }>('/trust/recommendations', { params: { mode } })).data.data,
  });
}

export function useMyRecommendationRequests() {
  return useQuery({
    queryKey: ['trust', 'recommendations', 'requests'],
    queryFn: async () => (await api.get<{ data: Array<{ id: string; requested_person_id: string; message: string | null; status: string }> }>('/trust/recommendations/requests')).data.data,
  });
}

export function useRequestRecommendation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { requestedPersonId: string; message?: string }) =>
      (await api.post('/trust/recommendations/requests', payload)).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trust', 'recommendations'] }),
  });
}

export function useWriteRecommendation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { subjectProfileId: string; relationshipType: string; body: string; visibility?: string }) =>
      (await api.post<{ data: RecommendationItem }>('/trust/recommendations', payload)).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trust', 'recommendations'] }),
  });
}

// --- Endorsements ------------------------------------------------------------------------------
export function useEndorsements(subjectProfileId?: string) {
  return useQuery({
    queryKey: ['trust', 'endorsements', subjectProfileId],
    queryFn: async () => (await api.get<{ data: EndorsementSkillBucket[] }>('/trust/endorsements', { params: subjectProfileId ? { subjectProfileId } : undefined })).data.data,
  });
}

export function useEndorseSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { subjectProfileId: string; skillId: string; relationshipContext?: string }) =>
      (await api.post('/trust/endorsements', payload)).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trust', 'endorsements'] }),
  });
}

// --- Verification centre -----------------------------------------------------------------------
export function useVerificationOverviewMe() {
  return useQuery({
    queryKey: ['trust', 'verifications', 'overview', 'me'],
    queryFn: async () => (await api.get<{ data: VerificationOverviewItem[] }>('/trust/verifications/overview/me')).data.data,
  });
}

export function useVerificationOverview(subjectType: string, subjectId: string | undefined) {
  return useQuery({
    queryKey: ['trust', 'verifications', 'overview', subjectType, subjectId],
    queryFn: async () => (await api.get<{ data: VerificationOverviewItem[] }>(`/trust/verifications/overview/${subjectType}/${subjectId}`)).data.data,
    enabled: Boolean(subjectId),
  });
}

export function useStartVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { verificationType: string; claimData?: Record<string, unknown> }) =>
      (await api.post('/trust/verifications', payload)).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trust', 'verifications'] }),
  });
}

export function useSubmitVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ verificationId, ...body }: { verificationId: string; method?: string; provider?: string; evidenceReference?: string[]; claimData?: Record<string, unknown> }) =>
      (await api.post(`/trust/verifications/${verificationId}/submit`, body)).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trust', 'verifications'] }),
  });
}

export function useVerificationUploadUrl() {
  return useMutation({
    mutationFn: async ({ verificationId, filename, contentType }: { verificationId: string; filename: string; contentType: string }) =>
      (await api.post<{ data: { key: string; url: string } }>(`/trust/verifications/${verificationId}/upload-url`, { filename, contentType })).data.data,
  });
}

export function useRequestDomainVerification() {
  return useMutation({
    mutationFn: async (payload: { subjectType: string; subjectId: string; domain: string }) =>
      (await api.post('/trust/verifications/domain', payload)).data.data,
  });
}

// --- Reports -------------------------------------------------------------------------------------
export function useReportReasons() {
  return useQuery({
    queryKey: ['trust', 'reports', 'reasons'],
    queryFn: async () => (await api.get<{ data: ReportReason[] }>('/trust/reports/reasons')).data.data,
  });
}

export function useSubmitReport() {
  return useMutation({
    mutationFn: async (payload: {
      objectType: string; objectId: string; reasonCode: string; subreasonCode?: string;
      description?: string; evidenceReference?: string[]; urgency?: 'normal' | 'urgent' | 'emergency';
    }) => (await api.post<{ data: { id: string; report_number: string } }>('/trust/reports', payload)).data.data,
  });
}

// --- Safety cases (internal) ----------------------------------------------------------------------
export function useSafetyCaseKpis() {
  return useQuery({
    queryKey: ['trust', 'safety-cases', 'kpis'],
    queryFn: async () => (await api.get('/trust/safety-cases/kpis')).data.data,
  });
}

export function useSafetyCases(params: { status?: string; severity?: string; queue?: string; caseType?: string }) {
  return useQuery({
    queryKey: ['trust', 'safety-cases', params],
    queryFn: async () => (await api.get<{ data: SafetyCase[]; pageInfo: { hasMore: boolean } }>('/trust/safety-cases', { params })).data,
  });
}

export function useSafetyCase(caseId: string | undefined) {
  return useQuery({
    queryKey: ['trust', 'safety-cases', caseId],
    queryFn: async () => (await api.get(`/trust/safety-cases/${caseId}`)).data.data,
    enabled: Boolean(caseId),
  });
}

// --- Appeals ---------------------------------------------------------------------------------------
export function useMyAppeals() {
  return useQuery({
    queryKey: ['trust', 'appeals', 'mine'],
    queryFn: async () => (await api.get<{ data: Appeal[] }>('/trust/appeals')).data.data,
  });
}

export function useAppealsQueue(status?: string) {
  return useQuery({
    queryKey: ['trust', 'appeals', 'queue', status],
    queryFn: async () => (await api.get<{ data: Appeal[]; pageInfo: { hasMore: boolean } }>('/trust/appeals', { params: { scope: 'queue', status } })).data,
  });
}

export function useSubmitAppeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { caseId?: string; decisionId?: string; reason: string; evidenceReference?: string[] }) =>
      (await api.post<{ data: Appeal }>('/trust/appeals', payload)).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trust', 'appeals'] }),
  });
}

export function useAppeal(appealId: string | undefined) {
  return useQuery({
    queryKey: ['trust', 'appeals', 'detail', appealId],
    queryFn: async () => (await api.get<{ data: Appeal }>(`/trust/appeals/${appealId}`)).data.data,
    enabled: Boolean(appealId),
  });
}

export function useInternalTrustAnalytics(enabled: boolean) {
  return useQuery({
    queryKey: ['trust', 'overview', 'internal-analytics'],
    queryFn: async () => (await api.get('/trust/overview/internal/analytics')).data.data,
    enabled,
  });
}

// --- Current user (for role gating on internal pages) -----------------------------------------------
const PLATFORM_ROLES = new Set(['super_admin', 'admin', 'moderator', 'customer_service', 'finance']);

export function useIsPlatformStaff() {
  return useQuery({
    queryKey: ['users', 'me', 'role'],
    queryFn: async () => {
      const res = await api.get<{ data: { role: string } }>('/users/me');
      return PLATFORM_ROLES.has(res.data.data.role);
    },
    staleTime: 5 * 60 * 1000,
  });
}
