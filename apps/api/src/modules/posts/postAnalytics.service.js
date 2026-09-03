import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { scoreContentQuality } from '../../common/ml/moderationClient.js';
import { logMlInference } from '../../common/ml/mlInferenceLog.js';

/**
 * Formats a Date as a local (server-timezone) YYYY-MM-DD key. Deliberately
 * NOT toISOString().slice(0,10) — pg's DATE type parser returns a Date at
 * local midnight for that calendar day, so converting via toISOString (UTC)
 * shifts the date backward by a day for any server timezone ahead of UTC.
 * Using local getFullYear/Month/Date keeps every date bucket (writes via
 * todayDate(), reads via toDateKey()) consistent with the same calendar day
 * an admin/author would recognize as "today".
 */
function toDateKey(d) {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayDate() {
  return toDateKey(new Date());
}

/**
 * Records real impressions for the given post IDs against today's
 * post_metrics_daily row (created on first impression of the day). Called
 * from the web app via IntersectionObserver when a post is >=50% visible
 * for >=1s, batched — never per-scroll-pixel.
 *
 * unique_reach only increments when this viewer's (post, date) dedup row is
 * actually new (see post_impression_viewers, migration 20260101000059) —
 * so it's a real distinct-viewer count, never an estimate.
 */
export async function recordImpressions(viewerId, postIds) {
  const ids = [...new Set((Array.isArray(postIds) ? postIds : [postIds]).filter(Boolean))];
  if (!ids.length) return;

  const existingPosts = await db('posts').whereIn('id', ids).whereNull('deleted_at').select('id');
  const validIds = new Set(existingPosts.map((p) => p.id));
  const date = todayDate();

  for (const postId of ids) {
    if (!validIds.has(postId)) continue;

    await db.transaction(async (trx) => {
      // .returning() with .onConflict().ignore() comes back empty when the
      // conflict was actually hit (no row inserted) — a reliable, driver-
      // agnostic way to detect "this viewer already had an impression on
      // this post today" vs. a genuinely new unique view.
      const inserted = await trx('post_impression_viewers')
        .insert({ post_id: postId, date, viewer_id: viewerId })
        .onConflict(['post_id', 'date', 'viewer_id'])
        .ignore()
        .returning('post_id');
      const isNewUniqueView = Array.isArray(inserted) && inserted.length > 0;

      const existingMetric = await trx('post_metrics_daily').where({ post_id: postId, date }).first('id');
      if (existingMetric) {
        await trx('post_metrics_daily')
          .where({ id: existingMetric.id })
          .increment('impressions', 1)
          .modify((qb) => {
            if (isNewUniqueView) qb.increment('unique_reach', 1);
          });
      } else {
        await trx('post_metrics_daily').insert({ post_id: postId, date, impressions: 1, unique_reach: isNewUniqueView ? 1 : 0 });
      }
    });
  }
}

const DAILY_METRIC_FIELDS = new Set(['reactions', 'comments', 'shares', 'saves', 'clicks']);

/**
 * Increments (or decrements) one real per-day engagement counter on
 * post_metrics_daily for "today" — called from posts.service.js at the
 * exact moment a reaction/comment/share/save actually happens, so the
 * Post Analytics time series reflects real day-by-day activity rather than
 * only a lifetime total. Fire-and-forget from the caller's perspective
 * (never blocks or fails the underlying action).
 */
export async function bumpDailyMetric(postId, field, delta = 1) {
  if (!DAILY_METRIC_FIELDS.has(field)) return;
  const date = todayDate();
  try {
    const existing = await db('post_metrics_daily').where({ post_id: postId, date }).first('id');
    if (existing) {
      if (delta >= 0) await db('post_metrics_daily').where({ id: existing.id }).increment(field, delta);
      else await db('post_metrics_daily').where({ id: existing.id }).decrement(field, Math.abs(delta));
    } else if (delta > 0) {
      await db('post_metrics_daily').insert({ post_id: postId, date, [field]: delta });
    }
  } catch {
    // Never let analytics bookkeeping fail the real user action that triggered it.
  }
}

async function assertCanViewAnalytics(userId, postId) {
  const post = await db('posts').where({ id: postId }).first();
  if (!post || post.deleted_at) throw new AppError('Post not found', 404);
  if (post.author_id === userId) return post;
  if (post.company_id) {
    const membership = await db('company_members')
      .where({ company_id: post.company_id, user_id: userId, status: 'active' })
      .whereIn('role', ['owner', 'admin'])
      .first();
    if (membership) return post;
  }
  throw new AppError('You do not have permission to view analytics for this post', 403);
}

function parseDateRange(startDate, endDate) {
  const end = endDate ? new Date(endDate) : new Date();
  const start = startDate ? new Date(startDate) : new Date(end.getTime() - 6 * 24 * 3600 * 1000);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) throw new AppError('Invalid date range', 422);
  return { start, end };
}

/**
 * Real aggregated analytics for the Post Analytics page: current lifetime
 * totals straight off the posts row, a day-by-day time series from
 * post_metrics_daily for the requested range (default last 7 days), and a
 * prior-period comparison computed from the same table over an
 * equal-length preceding window. Every number here traces to a real query
 * — no fabricated traffic-source/device/audience/AI-summary data, none of
 * which has a backing table in this schema.
 */
export async function getPostAnalytics(userId, postId, { startDate, endDate } = {}) {
  const post = await assertCanViewAnalytics(userId, postId);
  const { start, end } = parseDateRange(startDate, endDate);
  const rangeDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (24 * 3600 * 1000)) + 1);

  const priorEnd = new Date(start.getTime() - 24 * 3600 * 1000);
  const priorStart = new Date(priorEnd.getTime() - (rangeDays - 1) * 24 * 3600 * 1000);

  const [currentRows, priorRows] = await Promise.all([
    db('post_metrics_daily').where({ post_id: postId }).andWhere('date', '>=', toDateKey(start)).andWhere('date', '<=', toDateKey(end)).orderBy('date', 'asc'),
    db('post_metrics_daily').where({ post_id: postId }).andWhere('date', '>=', toDateKey(priorStart)).andWhere('date', '<=', toDateKey(priorEnd)),
  ]);

  const sum = (rows, key) => rows.reduce((acc, r) => acc + Number(r[key] || 0), 0);
  const currentTotals = {
    impressions: sum(currentRows, 'impressions'),
    uniqueReach: sum(currentRows, 'unique_reach'),
    saves: sum(currentRows, 'saves'),
    clicks: sum(currentRows, 'clicks'),
  };
  const priorTotals = {
    impressions: sum(priorRows, 'impressions'),
    uniqueReach: sum(priorRows, 'unique_reach'),
    saves: sum(priorRows, 'saves'),
    clicks: sum(priorRows, 'clicks'),
  };

  const totalEngagement = post.like_count + post.comment_count + post.share_count;
  const engagementRate = currentTotals.impressions > 0 ? Math.round((totalEngagement / currentTotals.impressions) * 1000) / 10 : 0;

  function pctChange(current, prior) {
    if (prior === 0) return current === 0 ? 0 : null; // null = "no prior data to compare against", never fabricated as 0% or infinite
    return Math.round(((current - prior) / prior) * 1000) / 10;
  }

  const dateKeys = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) dateKeys.push(toDateKey(d));
  const rowByDate = Object.fromEntries(currentRows.map((r) => [toDateKey(r.date), r]));
  const timeSeries = dateKeys.map((date) => {
    const row = rowByDate[date];
    return {
      date,
      impressions: Number(row?.impressions || 0),
      uniqueReach: Number(row?.unique_reach || 0),
      saves: Number(row?.saves || 0),
      clicks: Number(row?.clicks || 0),
    };
  });

  // Best-effort, author-only content-quality read from the ML service
  // (heuristic v1 — see content_quality_service.py). Never blocks or fails
  // the analytics page if the ML service is slow/unavailable: a null
  // `contentQuality` just means the panel omits that card, same fail-open
  // contract as feedRankerClient.js.
  const [attachmentCount, recentAuthorPosts] = await Promise.all([
    db('post_attachments').where({ post_id: postId }).count({ count: '*' }).first(),
    db('posts')
      .where({ author_id: post.author_id, status: 'published' })
      .andWhere('id', '!=', postId)
      .whereNull('deleted_at')
      .orderBy('created_at', 'desc')
      .limit(5)
      .pluck('content'),
  ]);
  const contentQuality = await scoreContentQuality({
    text: post.content || '',
    has_media: Number(attachmentCount?.count || 0) > 0,
    media_count: Number(attachmentCount?.count || 0),
    reaction_count: post.like_count,
    comment_count: post.comment_count,
    share_count: post.share_count,
    impression_count: currentTotals.impressions,
    recent_author_texts: recentAuthorPosts.filter(Boolean),
  }).catch(() => null);
  if (contentQuality) {
    logMlInference({ objectType: 'post', objectId: postId, modelName: 'quality-score', modelVersion: contentQuality.model_version, output: contentQuality }).catch(() => {});
  }

  return {
    postId,
    range: { startDate: toDateKey(start), endDate: toDateKey(end) },
    comparisonRange: { startDate: toDateKey(priorStart), endDate: toDateKey(priorEnd) },
    kpis: {
      impressions: currentTotals.impressions,
      reach: currentTotals.uniqueReach,
      engagementRate,
      reactions: post.like_count,
      comments: post.comment_count,
      shares: post.share_count,
      saves: currentTotals.saves,
    },
    changeVsPriorPeriod: {
      impressions: pctChange(currentTotals.impressions, priorTotals.impressions),
      reach: pctChange(currentTotals.uniqueReach, priorTotals.uniqueReach),
    },
    timeSeries,
    // null when the ML service is unavailable — heuristic v1, not a trained
    // classifier (see moderationClient.js / content_quality_service.py).
    contentQuality,
  };
}

/**
 * Real CSV export of the same day-by-day series getPostAnalytics returns —
 * no synthetic rows, no rounding beyond what's already stored.
 */
export async function exportPostAnalyticsCsv(userId, postId, { startDate, endDate } = {}) {
  const analytics = await getPostAnalytics(userId, postId, { startDate, endDate });
  const header = 'date,impressions,unique_reach,saves,clicks';
  const lines = analytics.timeSeries.map((r) => `${r.date},${r.impressions},${r.uniqueReach},${r.saves},${r.clicks}`);
  return [header, ...lines].join('\n');
}
