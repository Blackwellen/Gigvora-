import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { emitEvent } from '../../common/events/outbox.js';
import { notify } from '../../modules/notifications/notify.js';
import { recomputeReputationRollup } from './reputationRollup.service.js';
import { scoreReviewAnomaly } from '../../common/ml/trustRiskClient.js';

const EDIT_WINDOW_DAYS = 14;

/** §11/§19 — list eligible completed interactions the current user may still review. */
export async function listEligibleInteractions(userId) {
  // Reviewable engagements are those the user participated in that have no active review yet
  // from them. Only 'project'/'gig'/'service_booking' context types are wired today (matches
  // the reviews.context_type enum) — extend here as more transactional domains gain a
  // completion state worth reviewing.
  const alreadyReviewed = await db('reviews').where({ reviewer_person_id: userId }).select('context_type', 'context_id');
  const reviewedSet = new Set(alreadyReviewed.map((r) => `${r.context_type}:${r.context_id}`));

  const projects = await db('pm_projects')
    .where({ status: 'completed' })
    .andWhere((qb) => qb.where('owner_id', userId).orWhere('client_id', userId))
    .select('id', 'name', 'completed_at')
    .catch(() => []);

  return projects
    .filter((p) => !reviewedSet.has(`project:${p.id}`))
    .map((p) => ({ contextType: 'project', contextId: p.id, label: p.name, completedAt: p.completed_at }));
}

export async function listReviews({ viewerId, mode = 'received', subjectProfileId, rating, status, sort = 'recent', limit = 20, cursor }) {
  let query = db('reviews').select('reviews.*');

  if (mode === 'received') {
    query = query.where('reviews.subject_profile_id', subjectProfileId || viewerId);
  } else if (mode === 'written') {
    query = query.where('reviews.reviewer_person_id', viewerId);
  } else {
    throw new AppError('Invalid mode', 422);
  }

  if (rating) query = query.andWhere('overall_rating', '>=', Number(rating));
  if (status) query = query.andWhere('status', status);
  else query = query.whereIn('status', ['submitted', 'published']);

  if (cursor) query = query.andWhere('reviews.created_at', '<', cursor);

  switch (sort) {
    case 'highest':
      query = query.orderBy('overall_rating', 'desc');
      break;
    case 'lowest':
      query = query.orderBy('overall_rating', 'asc');
      break;
    case 'helpful':
      query = query.orderBy('helpful_count', 'desc');
      break;
    default:
      // Default ordering blends recency + verified + helpfulness (§18) rather than pure
      // positivity — verified reviews and more-helpful reviews surface earlier at equal age.
      query = query.orderByRaw('is_verified DESC, helpful_count DESC, reviews.created_at DESC');
  }

  const rows = await query.limit(limit + 1);
  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);

  const reviewIds = page.map((r) => r.id);
  const [ratings, responses, reviewers] = await Promise.all([
    reviewIds.length ? db('review_ratings').whereIn('review_id', reviewIds) : [],
    reviewIds.length ? db('review_responses').whereIn('review_id', reviewIds) : [],
    reviewIds.length
      ? db('users').whereIn('id', page.map((r) => r.reviewer_person_id)).select('id', 'first_name', 'last_name', 'avatar_url')
      : [],
  ]);
  const reviewerById = Object.fromEntries(reviewers.map((u) => [u.id, u]));

  return {
    data: page.map((r) => ({
      id: r.id,
      subjectProfileId: r.subject_profile_id,
      reviewer: reviewerById[r.reviewer_person_id]
        ? { id: r.reviewer_person_id, name: `${reviewerById[r.reviewer_person_id].first_name} ${reviewerById[r.reviewer_person_id].last_name}`, avatarUrl: reviewerById[r.reviewer_person_id].avatar_url }
        : null,
      contextType: r.context_type,
      contextId: r.context_id,
      overallRating: Number(r.overall_rating),
      reviewText: r.review_text,
      status: r.status,
      isVerified: r.is_verified,
      helpfulCount: r.helpful_count,
      notHelpfulCount: r.not_helpful_count,
      editedAt: r.edited_at,
      version: r.version,
      aspectRatings: ratings.filter((x) => x.review_id === r.id).map((x) => ({ dimension: x.dimension, score: Number(x.score) })),
      response: responses.find((x) => x.review_id === r.id) || null,
      createdAt: r.created_at,
    })),
    pageInfo: { hasMore, nextCursor: hasMore ? page[page.length - 1].created_at : null },
  };
}

export async function getReview(reviewId, viewerId) {
  const review = await db('reviews').where({ id: reviewId }).first();
  if (!review) throw new AppError('Review not found', 404);
  const [ratings, response, versions] = await Promise.all([
    db('review_ratings').where({ review_id: reviewId }),
    db('review_responses').where({ review_id: reviewId }).first(),
    // Version history only visible to the review's own author, the subject, or moderation.
    review.reviewer_person_id === viewerId ? db('review_versions').where({ review_id: reviewId }).orderBy('version', 'desc') : [],
  ]);
  return { ...review, overallRating: Number(review.overall_rating), aspectRatings: ratings, response: response || null, versions };
}

export async function submitReview(userId, { contextType, contextId, subjectProfileId, overallRating, reviewText, aspectRatings = [] }) {
  if (!contextType || !contextId || !subjectProfileId) throw new AppError('contextType, contextId and subjectProfileId are required', 422);
  if (subjectProfileId === userId) throw new AppError('You cannot review yourself', 422);
  if (!(overallRating >= 1 && overallRating <= 5)) throw new AppError('overallRating must be between 1 and 5', 422);

  // Eligibility is re-checked server-side, never trusted from the client wizard (§14/§27).
  const eligible = await listEligibleInteractions(userId);
  const isEligible = eligible.some((e) => e.contextType === contextType && String(e.contextId) === String(contextId));
  if (!isEligible) throw new AppError('You are not eligible to review this interaction, or have already reviewed it', 403);

  let review;
  await db.transaction(async (trx) => {
    [review] = await trx('reviews')
      .insert({
        subject_profile_id: subjectProfileId,
        reviewer_person_id: userId,
        context_type: contextType,
        context_id: contextId,
        overall_rating: overallRating,
        review_text: reviewText || null,
        status: 'published',
        is_verified: true,
      })
      .returning('*');

    if (aspectRatings.length) {
      await trx('review_ratings').insert(
        aspectRatings.map((a) => ({ review_id: review.id, dimension: a.dimension, score: a.score }))
      );
    }

    await recomputeReputationRollup('profile', subjectProfileId, trx);
    await emitEvent({ aggregateType: 'review', aggregateId: review.id, eventType: 'trust.review.published', payload: { subjectProfileId, reviewerId: userId } }, trx);
  });

  // Fail-open anomaly scoring happens after commit — never blocks publish (§21/§236).
  scoreReviewAnomaly({ reviewId: review.id, authorId: userId, subjectId: subjectProfileId, contextType, contextId, reviewText }).then(async (result) => {
    if (result && result.riskScore > 0.7) {
      await db('reviews').where({ id: review.id }).update({ fraud_risk_score: result.riskScore, status: 'under_review' });
    } else if (result) {
      await db('reviews').where({ id: review.id }).update({ fraud_risk_score: result.riskScore });
    }
  }).catch(() => {});

  await notify({ userId: subjectProfileId, actorId: userId, type: 'trust.review.received', payload: { reviewId: review.id, overallRating } });

  return getReview(review.id, userId);
}

export async function editReview(reviewId, userId, { overallRating, reviewText, reasonCode }) {
  const review = await db('reviews').where({ id: reviewId }).first();
  if (!review) throw new AppError('Review not found', 404);
  if (review.reviewer_person_id !== userId) throw new AppError('Forbidden', 403);
  const ageDays = (Date.now() - new Date(review.created_at).getTime()) / 86400000;
  if (ageDays > EDIT_WINDOW_DAYS) throw new AppError('The edit window for this review has closed', 422);

  await db.transaction(async (trx) => {
    await trx('review_versions').insert({
      review_id: reviewId,
      version: review.version,
      overall_rating: review.overall_rating,
      review_text: review.review_text,
      edited_by: userId,
      reason_code: reasonCode || null,
    });
    await trx('reviews').where({ id: reviewId }).update({
      overall_rating: overallRating ?? review.overall_rating,
      review_text: reviewText ?? review.review_text,
      version: review.version + 1,
      edited_at: trx.fn.now(),
      edited_by: userId,
      updated_at: trx.fn.now(),
    });
    await recomputeReputationRollup('profile', review.subject_profile_id, trx);
    await emitEvent({ aggregateType: 'review', aggregateId: reviewId, eventType: 'trust.review.updated', payload: { editedBy: userId } }, trx);
  });

  return getReview(reviewId, userId);
}

export async function voteHelpful(reviewId, userId, isHelpful) {
  const review = await db('reviews').where({ id: reviewId }).first();
  if (!review) throw new AppError('Review not found', 404);
  if (review.reviewer_person_id === userId) throw new AppError('You cannot vote on your own review', 422);

  const existing = await db('review_helpful_votes').where({ review_id: reviewId, user_id: userId }).first();
  await db.transaction(async (trx) => {
    if (existing) {
      if (existing.is_helpful === isHelpful) return; // idempotent no-op
      await trx('review_helpful_votes').where({ id: existing.id }).update({ is_helpful: isHelpful });
      await trx('reviews').where({ id: reviewId }).increment(isHelpful ? 'helpful_count' : 'not_helpful_count', 1);
      await trx('reviews').where({ id: reviewId }).decrement(isHelpful ? 'not_helpful_count' : 'helpful_count', 1);
    } else {
      await trx('review_helpful_votes').insert({ review_id: reviewId, user_id: userId, is_helpful: isHelpful });
      await trx('reviews').where({ id: reviewId }).increment(isHelpful ? 'helpful_count' : 'not_helpful_count', 1);
    }
  });
  return getReview(reviewId, userId);
}

export async function respondToReview(reviewId, userId, responseText) {
  const review = await db('reviews').where({ id: reviewId }).first();
  if (!review) throw new AppError('Review not found', 404);
  if (review.subject_profile_id !== userId) throw new AppError('Only the review subject may respond', 403);
  const existing = await db('review_responses').where({ review_id: reviewId }).first();
  if (existing) throw new AppError('A response has already been submitted for this review', 409);

  const [response] = await db('review_responses')
    .insert({ review_id: reviewId, profile_id: userId, response_text: responseText })
    .returning('*');
  await emitEvent({ aggregateType: 'review', aggregateId: reviewId, eventType: 'trust.review.response_created', payload: { responseId: response.id } });
  await notify({ userId: review.reviewer_person_id, actorId: userId, type: 'trust.review.response_received', payload: { reviewId } });
  return response;
}

export async function removeReview(reviewId, moderatorId, reasonCode) {
  const review = await db('reviews').where({ id: reviewId }).first();
  if (!review) throw new AppError('Review not found', 404);
  await db.transaction(async (trx) => {
    await trx('reviews').where({ id: reviewId }).update({ status: 'removed', removed_at: trx.fn.now(), removed_by: moderatorId, removal_reason_code: reasonCode || null });
    await recomputeReputationRollup('profile', review.subject_profile_id, trx);
    await trx('trust_audit_log').insert({ actor_id: moderatorId, action: 'review.removed', object_type: 'review', object_id: reviewId, reason: reasonCode || null });
    await emitEvent({ aggregateType: 'review', aggregateId: reviewId, eventType: 'trust.review.removed', payload: { reasonCode } }, trx);
  });
}

export async function restoreReview(reviewId, moderatorId) {
  const review = await db('reviews').where({ id: reviewId }).first();
  if (!review) throw new AppError('Review not found', 404);
  await db.transaction(async (trx) => {
    await trx('reviews').where({ id: reviewId }).update({ status: 'published', removed_at: null, removed_by: null, removal_reason_code: null });
    await recomputeReputationRollup('profile', review.subject_profile_id, trx);
    await trx('trust_audit_log').insert({ actor_id: moderatorId, action: 'review.restored', object_type: 'review', object_id: reviewId });
  });
}
