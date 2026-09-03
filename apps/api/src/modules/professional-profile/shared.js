import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';

/**
 * Domain 14 routes live under the authenticated `/app/*` shell and always
 * operate on the caller's own Professional Profile (see architecture note in
 * the migration + repo convention of id-less `/app/projects` etc.). Public
 * viewing of *other* people's profiles is Domain 02's public-directory
 * concern, which already has its own projection.
 */
export async function getOwnProfileId(userId) {
  const row = await db('profiles').where({ user_id: userId }).first('id');
  if (!row) throw new AppError('Professional profile not found', 404);
  return row.id;
}

export async function getProfileRow(userId) {
  const row = await db('profiles').where({ user_id: userId }).first();
  if (!row) throw new AppError('Professional profile not found', 404);
  return row;
}

const SECTION_WEIGHTS = {
  photo: 8,
  cover: 5,
  headline: 8,
  summary: 12,
  location: 5,
  skills: 12,
  experience: 15,
  education: 8,
  portfolio: 12,
  services: 5,
  availability: 5,
  verification: 5,
};

export const COMPLETENESS_SCORING_VERSION = 'v1-deterministic-2026';

/**
 * Deterministic, weighted profile completeness — §68. No AI involved; every
 * point is tied to a concrete, checkable fact about the profile row.
 */
export async function recomputeCompleteness(profileId, trx = db) {
  const profile = await trx('profiles').where({ id: profileId }).first();
  if (!profile) return null;

  const [skillCount, expCount, eduCount, portfolioCount, serviceCount, availability] = await Promise.all([
    trx('profile_skills').where({ profile_id: profileId }).count('id as c').first(),
    trx('experiences').where({ profile_id: profileId }).count('id as c').first(),
    trx('education').where({ profile_id: profileId }).count('id as c').first(),
    trx('portfolio_items').where({ profile_id: profileId, status: 'published' }).count('id as c').first(),
    trx('professional_services').where({ profile_id: profileId, status: 'active' }).count('id as c').first(),
    trx('profile_availability').where({ profile_id: profileId }).first(),
  ]);

  const have = {
    photo: Boolean(profile.avatar_url),
    cover: Boolean(profile.cover_url),
    headline: Boolean(profile.headline),
    summary: Boolean(profile.bio && profile.bio.length >= 40),
    location: Boolean(profile.location),
    skills: Number(skillCount?.c || 0) >= 3,
    experience: Number(expCount?.c || 0) >= 1,
    education: Number(eduCount?.c || 0) >= 1,
    portfolio: Number(portfolioCount?.c || 0) >= 1,
    services: Number(serviceCount?.c || 0) >= 1,
    availability: Boolean(availability),
    verification: profile.verification_status === 'verified',
  };

  let score = 0;
  const missing = [];
  for (const [section, weight] of Object.entries(SECTION_WEIGHTS)) {
    if (have[section]) score += weight;
    else missing.push(section);
  }

  await trx('profiles')
    .where({ id: profileId })
    .update({
      completeness_score: score,
      completeness_missing_sections: JSON.stringify(missing),
      completeness_scoring_version: COMPLETENESS_SCORING_VERSION,
      completeness_calculated_at: trx.fn.now(),
    });

  return { score, missingSections: missing, scoringVersion: COMPLETENESS_SCORING_VERSION };
}

export const TRUST_ALGORITHM_VERSION = 'v1-bayesian-shrinkage-2026';
const TRUST_PRIOR_MEAN = 4.2; // platform-wide prior average rating out of 5, used for shrinkage
const TRUST_PRIOR_WEIGHT = 8; // "virtual" review count the prior is worth — dampens small samples

/**
 * §29-30: confidence-aware Trust Score. Never a bare `rating * 20`. Uses
 * Bayesian shrinkage toward a platform prior so one 5-star review cannot
 * outrank someone with 100 verified 4.9-star reviews, plus reliability
 * signals (completion, repeat clients, verification). Returns null (not a
 * fabricated number) when there isn't enough real signal yet.
 */
export async function recomputeTrustScore(profileId, trx = db) {
  const [reviewAgg, repeatClientAgg, verifiedProfile] = await Promise.all([
    trx('reviews').where({ subject_profile_id: profileId, status: 'published' }).select('overall_rating', 'reviewer_person_id', 'created_at'),
    trx('reviews').where({ subject_profile_id: profileId, status: 'published' }).count('id as c').groupBy('reviewer_person_id'),
    trx('profiles').where({ id: profileId }).first('verification_status'),
  ]);

  const reviewCount = reviewAgg.length;
  if (reviewCount === 0) {
    await trx('profiles')
      .where({ id: profileId })
      .update({ trust_score: null, trust_band: null, trust_calculated_at: trx.fn.now(), trust_algorithm_version: TRUST_ALGORITHM_VERSION, trust_reason_codes: JSON.stringify([]) });
    return null;
  }

  const sumRatings = reviewAgg.reduce((acc, r) => acc + Number(r.overall_rating), 0);
  const shrunkMean = (TRUST_PRIOR_WEIGHT * TRUST_PRIOR_MEAN + sumRatings) / (TRUST_PRIOR_WEIGHT + reviewCount);

  const repeatClients = repeatClientAgg.filter((row) => Number(row.c) > 1).length;
  const uniqueReviewers = repeatClientAgg.length;
  const repeatRate = uniqueReviewers > 0 ? repeatClients / uniqueReviewers : 0;

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const recentReviews = reviewAgg.filter((r) => new Date(r.created_at) >= ninetyDaysAgo);
  const recencyFactor = reviewCount >= 5 ? Math.min(1, 0.6 + recentReviews.length / reviewCount) : 0.85;

  const ratingComponent = (shrunkMean / 5) * 60; // up to 60 pts
  const volumeComponent = Math.min(1, Math.log10(reviewCount + 1) / Math.log10(51)) * 15; // up to 15 pts, saturates ~50 reviews
  const repeatComponent = repeatRate * 10; // up to 10 pts
  const verificationComponent = verifiedProfile?.verification_status === 'verified' ? 10 : 0;
  const recencyComponent = recencyFactor * 5; // up to 5 pts

  const raw = ratingComponent + volumeComponent + repeatComponent + verificationComponent + recencyComponent;
  const score = Math.max(0, Math.min(100, Math.round(raw)));

  const reasonCodes = [];
  if (shrunkMean >= 4.6) reasonCodes.push('high_verified_review_satisfaction');
  if (reviewCount >= 20) reasonCodes.push('strong_review_volume');
  if (repeatRate >= 0.3) reasonCodes.push('repeat_client_relationships');
  if (verifiedProfile?.verification_status === 'verified') reasonCodes.push('identity_verified');
  if (recencyFactor >= 0.9) reasonCodes.push('consistent_recent_performance');

  const band = score >= 90 ? 'excellent' : score >= 75 ? 'strong' : score >= 55 ? 'developing' : 'new';

  await trx('profiles')
    .where({ id: profileId })
    .update({
      trust_score: score,
      trust_band: band,
      trust_calculated_at: trx.fn.now(),
      trust_algorithm_version: TRUST_ALGORITHM_VERSION,
      trust_reason_codes: JSON.stringify(reasonCodes),
    });

  return { score, band, reasonCodes, algorithmVersion: TRUST_ALGORITHM_VERSION };
}
