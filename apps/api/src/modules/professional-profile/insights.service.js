// §71/§73/§75: AI-labelled rails across Domain 14, built the same way the
// existing Copilot module does it (apps/api/src/modules/copilot/copilot.service.js
// — deterministic, data-grounded text assembled from real counts, not an
// LLM call). No model available in this environment is licensed to invent
// numbers, so every sentence here is generated from a value the caller can
// also see elsewhere on the page. Returns `available: false` with a reason
// instead of fabricating text when there isn't enough real signal yet.
import { db } from '../../db/connection.js';
import { getOwnProfileId } from './shared.js';

export async function getTimelineSummary(userId) {
  const profileId = await getOwnProfileId(userId);
  const profile = await db('profiles').where({ id: profileId }).first('user_id');
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const posts = await db('posts').where({ author_id: profile.user_id }).andWhere('created_at', '>=', since).select('like_count', 'comment_count', 'share_count');
  if (posts.length === 0) {
    return { available: false, reason: 'No posts in the last 30 days yet — share an update to generate a summary.' };
  }

  const totalEngagement = posts.reduce((acc, p) => acc + (p.like_count || 0) + (p.comment_count || 0) + (p.share_count || 0), 0);
  const avgEngagement = Math.round(totalEngagement / posts.length);
  const highEngagementCount = posts.filter((p) => (p.like_count || 0) + (p.comment_count || 0) + (p.share_count || 0) > avgEngagement * 1.5).length;

  const bullets = [`${posts.length} post${posts.length === 1 ? '' : 's'} this month`];
  if (highEngagementCount > 0) bullets.push(`${highEngagementCount} post${highEngagementCount === 1 ? '' : 's'} with above-average engagement`);
  bullets.push(`Average engagement of ${avgEngagement} reaction${avgEngagement === 1 ? '' : 's'}, comments and shares per post`);

  return {
    available: true,
    summary: `${posts.length} post${posts.length === 1 ? '' : 's'} shared in the last 30 days, averaging ${avgEngagement} engagement${avgEngagement === 1 ? '' : 's'} each.`,
    bullets,
  };
}

export async function getReviewInsights(userId) {
  const profileId = await getOwnProfileId(userId);
  const reviews = await db('reviews').where({ subject_profile_id: profileId, status: 'published' }).select('review_text', 'overall_rating');
  const MIN_SAMPLE = 5; // §75: don't infer a characteristic from one review

  if (reviews.length < MIN_SAMPLE) {
    return { available: false, reason: `Needs at least ${MIN_SAMPLE} verified reviews to surface theme analysis (currently ${reviews.length}).` };
  }

  const ratingRatios = await db('review_ratings as rr')
    .join('reviews as r', 'r.id', 'rr.review_id')
    .where('r.subject_profile_id', profileId)
    .select('rr.dimension')
    .avg('rr.score as avg_score')
    .groupBy('rr.dimension');

  const strengths = ratingRatios.filter((r) => Number(r.avg_score) >= 4.5).map((r) => r.dimension);
  const improvements = ratingRatios.filter((r) => Number(r.avg_score) < 4).map((r) => r.dimension);

  return {
    available: true,
    strengths: strengths.map((dimension) => ({ dimension, label: dimensionLabel(dimension) })),
    improvements: improvements.map((dimension) => ({ dimension, label: dimensionLabel(dimension) })),
  };
}

function dimensionLabel(dimension) {
  return { communication: 'Communication', quality_of_work: 'Quality of work', timeliness: 'Timeliness', value_for_money: 'Value for money' }[dimension] || dimension;
}

export async function getAnalyticsSummary(userId) {
  const profileId = await getOwnProfileId(userId);
  const rows = await db('profile_metrics_daily').where({ profile_id: profileId }).orderBy('metric_date', 'desc').limit(30);
  if (rows.length === 0) return { available: false, reason: 'No analytics data recorded yet.' };

  const totalViews = rows.reduce((a, r) => a + r.profile_views, 0);
  const totalRecruiterViews = rows.reduce((a, r) => a + r.recruiter_views, 0);
  const bullets = [`${totalViews} profile view${totalViews === 1 ? '' : 's'} in the last ${rows.length} day${rows.length === 1 ? '' : 's'}`];
  if (totalRecruiterViews > 0) bullets.push(`${totalRecruiterViews} of those were from recruiters`);
  return { available: true, bullets };
}
