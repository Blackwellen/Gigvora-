import { db } from '../../db/connection.js';

/**
 * Recomputes the cached reputation_rollups row for one subject from authoritative source
 * tables (reviews, recommendations, endorsements). Never the source of truth (§77/§219) —
 * called after every review publish/edit/remove/restore and recommendation/endorsement change.
 * Cheap enough to run inline post-commit; if volume grows this is the natural place to move
 * behind a queue job without changing the read contract.
 */
export async function recomputeReputationRollup(subjectType, subjectId, trx = db) {
  const reviews = await trx('reviews')
    .where({ subject_profile_id: subjectId })
    .whereIn('status', ['submitted', 'published'])
    .select('overall_rating', 'is_verified');

  const reviewCount = reviews.length;
  const verifiedReviewCount = reviews.filter((r) => r.is_verified).length;
  const ratingAverage = reviewCount ? reviews.reduce((sum, r) => sum + Number(r.overall_rating), 0) / reviewCount : null;
  const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of reviews) {
    const bucket = Math.min(5, Math.max(1, Math.round(Number(r.overall_rating))));
    ratingDistribution[bucket] += 1;
  }

  const [{ count: recommendationCount }] = await trx('recommendations')
    .where({ subject_profile_id: subjectId, status: 'published' })
    .count({ count: '*' });
  const [{ count: endorsementCount }] = await trx('endorsements')
    .where({ subject_profile_id: subjectId })
    .count({ count: '*' });

  await trx('reputation_rollups')
    .insert({
      subject_type: subjectType,
      subject_id: subjectId,
      review_count: reviewCount,
      verified_review_count: verifiedReviewCount,
      rating_average: ratingAverage,
      rating_distribution: JSON.stringify(ratingDistribution),
      recommendation_count: Number(recommendationCount),
      endorsement_count: Number(endorsementCount),
      updated_at: trx.fn.now(),
    })
    .onConflict(['subject_type', 'subject_id'])
    .merge();
}
