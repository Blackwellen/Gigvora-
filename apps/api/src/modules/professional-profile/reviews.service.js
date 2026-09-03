import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { emitEvent } from '../../common/events/outbox.js';
import { getOwnProfileId, recomputeTrustScore } from './shared.js';

const DIMENSIONS = ['communication', 'quality_of_work', 'timeliness', 'value_for_money'];
const EDIT_WINDOW_DAYS = 14;

/**
 * §26-27: server validates the reviewer actually has a completed, eligible
 * engagement with this profile before a review can be written — never
 * trusts a client-supplied context id at face value.
 */
async function validateEligibility(reviewerPersonId, subjectProfile, contextType, contextId) {
  if (contextType === 'project') {
    const project = await db('projects').where({ id: contextId }).first('id', 'owner_id', 'owner_type', 'status', 'assigned_professional_id');
    if (!project) throw new AppError('Project not found', 404);
    if (project.status !== 'completed') throw new AppError('This project is not marked completed yet', 422);
    if (project.assigned_professional_id !== subjectProfile.user_id) throw new AppError('This profile was not the assigned professional on this project', 422);
    const eligible =
      (project.owner_type === 'user' && project.owner_id === reviewerPersonId) ||
      (project.owner_type === 'company' && (await db('company_members').where({ company_id: project.owner_id, user_id: reviewerPersonId, status: 'active' }).first('id')));
    if (!eligible) throw new AppError('You are not authorized to review this project', 403);
    return;
  }
  if (contextType === 'gig') {
    const gig = await db('gigs').where({ id: contextId }).first('id', 'posted_by', 'status', 'assigned_professional_id');
    if (!gig) throw new AppError('Gig not found', 404);
    if (gig.status !== 'closed') throw new AppError('This gig is not marked completed yet', 422);
    if (gig.assigned_professional_id !== subjectProfile.user_id) throw new AppError('This profile was not the assigned professional on this gig', 422);
    if (gig.posted_by !== reviewerPersonId) throw new AppError('You are not authorized to review this gig', 403);
    return;
  }
  if (contextType === 'service_booking') {
    const booking = await db('service_bookings').where({ id: contextId }).first('id', 'client_user_id', 'profile_id', 'status');
    if (!booking) throw new AppError('Service booking not found', 404);
    if (booking.status !== 'completed') throw new AppError('This booking is not marked completed yet', 422);
    if (booking.profile_id !== subjectProfile.id) throw new AppError('This booking does not belong to this profile', 422);
    if (booking.client_user_id !== reviewerPersonId) throw new AppError('You are not authorized to review this booking', 403);
    return;
  }
  throw new AppError('Invalid review context type', 422);
}

async function withDetail(row) {
  const [ratings, reviewer, response] = await Promise.all([
    db('review_ratings').where({ review_id: row.id }).select('dimension', 'score'),
    db('users').where({ id: row.reviewer_person_id }).first('id', 'first_name', 'last_name', 'headline', 'account_type'),
    db('review_responses').where({ review_id: row.id }).first(),
  ]);

  let context = null;
  if (row.context_type === 'project') context = await db('projects').where({ id: row.context_id }).first('id', 'title', 'slug');
  else if (row.context_type === 'gig') context = await db('gigs').where({ id: row.context_id }).first('id', 'title', 'slug');
  else if (row.context_type === 'service_booking') {
    const booking = await db('service_bookings').where({ id: row.context_id }).first('service_id');
    context = booking ? await db('professional_services').where({ id: booking.service_id }).first('id', 'title') : null;
  }

  return { ...row, ratings, reviewer, response: response || null, context };
}

export async function submitReview(reviewerPersonId, subjectProfileId, input) {
  const subjectProfile = await db('profiles').where({ id: subjectProfileId }).first('id', 'user_id');
  if (!subjectProfile) throw new AppError('Profile not found', 404);
  if (subjectProfile.user_id === reviewerPersonId) throw new AppError('You cannot review your own profile', 422);
  if (!input.contextType || !input.contextId) throw new AppError('A review must reference a project, gig or service booking', 422);
  if (!input.overallRating || input.overallRating < 1 || input.overallRating > 5) throw new AppError('Overall rating must be between 1 and 5', 422);

  await validateEligibility(reviewerPersonId, subjectProfile, input.contextType, input.contextId);

  const existing = await db('reviews')
    .where({ reviewer_person_id: reviewerPersonId, context_type: input.contextType, context_id: input.contextId })
    .first('id');
  if (existing) throw new AppError('You already reviewed this engagement', 409);

  const [row] = await db('reviews')
    .insert({
      subject_profile_id: subjectProfileId,
      reviewer_person_id: reviewerPersonId,
      context_type: input.contextType,
      context_id: input.contextId,
      overall_rating: input.overallRating,
      review_text: input.reviewText || null,
      status: 'published',
      is_verified: true,
      editable_until: db.raw(`now() + interval '${EDIT_WINDOW_DAYS} days'`),
    })
    .returning('*');

  if (input.ratings && typeof input.ratings === 'object') {
    for (const dimension of DIMENSIONS) {
      const score = input.ratings[dimension];
      if (score != null) await db('review_ratings').insert({ review_id: row.id, dimension, score });
    }
  }

  await emitEvent({ aggregateType: 'review', aggregateId: row.id, eventType: 'review.created', payload: { subjectProfileId } });
  await emitEvent({ aggregateType: 'review', aggregateId: row.id, eventType: 'review.verified', payload: { subjectProfileId } });
  await recomputeTrustScore(subjectProfileId);
  await emitEvent({ aggregateType: 'professional_profile', aggregateId: subjectProfileId, eventType: 'profile.trust_score.updated', payload: {} });

  return withDetail(row);
}

export async function editReview(reviewerPersonId, reviewId, input) {
  const row = await db('reviews').where({ id: reviewId, reviewer_person_id: reviewerPersonId }).first();
  if (!row) throw new AppError('Review not found', 404);
  if (row.editable_until && new Date(row.editable_until) < new Date()) {
    throw new AppError('The edit window for this review has closed. Contact support for a correction.', 422, { code: 'REVIEW_EDIT_WINDOW_CLOSED' });
  }

  const patch = {};
  if ('overallRating' in input) patch.overall_rating = input.overallRating;
  if ('reviewText' in input) patch.review_text = input.reviewText;
  const [updated] = await db('reviews').where({ id: reviewId }).update(patch).returning('*');

  if (input.ratings) {
    for (const dimension of DIMENSIONS) {
      const score = input.ratings[dimension];
      if (score != null) {
        await db('review_ratings').insert({ review_id: reviewId, dimension, score }).onConflict(['review_id', 'dimension']).merge({ score });
      }
    }
  }

  await emitEvent({ aggregateType: 'review', aggregateId: reviewId, eventType: 'review.updated', payload: {} });
  await recomputeTrustScore(row.subject_profile_id);
  return withDetail(updated);
}

export async function respondToReview(userId, reviewId, responseText) {
  const profileId = await getOwnProfileId(userId);
  const review = await db('reviews').where({ id: reviewId, subject_profile_id: profileId }).first('id');
  if (!review) throw new AppError('Review not found', 404);
  if (!responseText || responseText.trim().length < 5) throw new AppError('Response is too short', 422);

  const [row] = await db('review_responses')
    .insert({ review_id: reviewId, profile_id: profileId, response_text: responseText.trim() })
    .onConflict('review_id')
    .merge({ response_text: responseText.trim(), updated_at: db.fn.now() })
    .returning('*');
  return row;
}

export async function list(userId, { filter, sort, cursor, limit = 20 } = {}) {
  const profileId = await getOwnProfileId(userId);
  let query = db('reviews').where({ subject_profile_id: profileId }).whereIn('status', ['published', 'disputed']);

  if (filter === 'projects') query = query.andWhere({ context_type: 'project' });
  if (filter === 'gigs') query = query.andWhere({ context_type: 'gig' });
  if (filter === 'highest') query = query.orderBy('overall_rating', 'desc');
  else if (filter === 'critical') query = query.andWhere('overall_rating', '<=', 3);

  if (sort === 'recent' || !filter) query = query.orderBy('created_at', 'desc');

  if (cursor) query = query.andWhere('created_at', '<', cursor);
  const rows = await query.limit(Math.min(limit, 50));
  return Promise.all(rows.map(withDetail));
}

/**
 * §25 KPI strip — Overall rating, Trust score, Verified reviews, Repeat
 * clients, On-time delivery, Recommendation rate. Every figure is derived
 * from real rows; when there isn't enough data yet, fields come back null
 * rather than a fabricated placeholder.
 */
export async function getAggregate(userId) {
  const profileId = await getOwnProfileId(userId);
  const [profile, reviews, projectCount, gigCount, recommendationCount] = await Promise.all([
    db('profiles').where({ id: profileId }).first('trust_score', 'trust_band', 'trust_reason_codes', 'trust_algorithm_version'),
    db('reviews').where({ subject_profile_id: profileId, status: 'published' }).select('overall_rating', 'reviewer_person_id', 'context_type'),
    db('reviews').where({ subject_profile_id: profileId, status: 'published', context_type: 'project' }).count('id as c').first(),
    db('reviews').where({ subject_profile_id: profileId, status: 'published', context_type: 'gig' }).count('id as c').first(),
    db('recommendations').where({ subject_profile_id: profileId, status: 'published' }).count('id as c').first(),
  ]);

  const reviewCount = reviews.length;
  const overallRating = reviewCount ? Number((reviews.reduce((a, r) => a + Number(r.overall_rating), 0) / reviewCount).toFixed(2)) : null;

  const reviewerCounts = {};
  for (const r of reviews) reviewerCounts[r.reviewer_person_id] = (reviewerCounts[r.reviewer_person_id] || 0) + 1;
  const uniqueReviewers = Object.keys(reviewerCounts).length;
  const repeatClients = Object.values(reviewerCounts).filter((c) => c > 1).length;
  const repeatClientRate = uniqueReviewers ? Math.round((repeatClients / uniqueReviewers) * 100) : null;

  const timelinessRatings = await db('review_ratings as rr')
    .join('reviews as r', 'r.id', 'rr.review_id')
    .where('r.subject_profile_id', profileId)
    .andWhere('rr.dimension', 'timeliness')
    .select('rr.score');
  const onTimeDelivery = timelinessRatings.length
    ? Math.round((timelinessRatings.filter((t) => Number(t.score) >= 4).length / timelinessRatings.length) * 100)
    : null;

  const recommendationRate = reviewCount ? Math.round((reviews.filter((r) => Number(r.overall_rating) >= 4).length / reviewCount) * 100) : null;

  return {
    overallRating,
    reviewCount,
    trustScore: profile.trust_score,
    trustBand: profile.trust_band,
    trustReasonCodes: profile.trust_reason_codes || [],
    trustAlgorithmVersion: profile.trust_algorithm_version,
    verifiedReviewCount: reviewCount, // all rows here are is_verified=true by construction
    repeatClientRate,
    onTimeDelivery,
    recommendationRate,
    projectReviewCount: Number(projectCount?.c || 0),
    gigReviewCount: Number(gigCount?.c || 0),
    recommendationCount: Number(recommendationCount?.c || 0),
  };
}
