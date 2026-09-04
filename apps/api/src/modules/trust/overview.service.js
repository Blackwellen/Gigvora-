import { db } from '../../db/connection.js';
import { getOverview as getVerificationOverview } from './verifications.service.js';

/**
 * §9/§75/§76 — the componentized Trust Centre read model. Deliberately returns many
 * purpose-specific signals rather than one blended score (see spec §7/§75/§76).
 */
export async function getTrustOverview(subjectType, subjectId) {
  const [verifications, rollup, signals, openCases, myReportsCount, blockedCount] = await Promise.all([
    getVerificationOverview(subjectType, subjectId),
    db('reputation_rollups').where({ subject_type: subjectType, subject_id: subjectId }).first(),
    db('trust_signals').where({ subject_type: subjectType, subject_id: subjectId }).andWhere('public_visibility', true),
    db('safety_cases').where({ subject_type: subjectType, subject_id: subjectId }).whereNotIn('status', ['closed']).count({ count: '*' }).first(),
    db('reports').where({ reporter_id: subjectId }).count({ count: '*' }).first(),
    Promise.resolve(0), // Blocking relationships live in the social/network domain — wire in once that table is confirmed.
  ]);

  return {
    verifications,
    reputation: rollup
      ? {
          reviewCount: rollup.review_count,
          verifiedReviewCount: rollup.verified_review_count,
          ratingAverage: rollup.rating_average ? Number(rollup.rating_average) : null,
          ratingDistribution: rollup.rating_distribution,
          recommendationCount: rollup.recommendation_count,
          endorsementCount: rollup.endorsement_count,
          completedTransactionCount: rollup.completed_transaction_count,
          disputeRate: rollup.dispute_rate ? Number(rollup.dispute_rate) : null,
        }
      : { reviewCount: 0, verifiedReviewCount: 0, ratingAverage: null, ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, recommendationCount: 0, endorsementCount: 0, completedTransactionCount: 0, disputeRate: null },
    signals: signals.map((s) => ({ key: s.signal_key, type: s.signal_type, value: s.value, confidence: s.confidence, computedAt: s.computed_at, validUntil: s.valid_until })),
    safety: { openCases: Number(openCases?.count || 0), reportsSubmitted: Number(myReportsCount?.count || 0), blockedAccounts: blockedCount },
  };
}

/** §21/§78 — deterministic recency-weighted anomaly heuristic used when ML is unavailable. */
export async function getReviewIntegritySummary(subjectId) {
  const recent = await db('reviews').where({ subject_profile_id: subjectId }).andWhere('created_at', '>', db.raw("now() - interval '7 days'")).count({ count: '*' }).first();
  const total = await db('reviews').where({ subject_profile_id: subjectId }).count({ count: '*' }).first();
  const burstShare = Number(total?.count || 0) > 0 ? Number(recent?.count || 0) / Number(total.count) : 0;
  return { recentReviewCount: Number(recent?.count || 0), burstShare, flagged: burstShare > 0.6 && Number(recent?.count || 0) >= 5 };
}
