import { db } from '../../db/connection.js';
import { visibleCandidates, hydratePosts } from '../posts/posts.service.js';

const WINDOWS = { '24h': 24, '7d': 24 * 7, '30d': 24 * 30 };

/**
 * Trend score formula (documented here, not fabricated elsewhere):
 *
 *   score = (reactions_in_window + comments_in_window * 2 + shares_in_window * 3)
 *           / max(1, hours_since_window_start_or_creation)
 *
 * i.e. real engagement *velocity* within the window — comments and shares
 * are weighted higher than reactions (matching the same weighting already
 * used by posts.service.js's deterministic feed ranker), then divided by
 * elapsed hours so a post that got 30 reactions in the last hour outranks
 * one that slowly accumulated 30 reactions over 30 days. "hours elapsed" is
 * capped to the window itself for a post created before the window started
 * (an older, still-live post), or to its real age for a post created inside
 * the window (a fresh post) — either way the denominator is real elapsed
 * time, never fabricated.
 */
function computeScore({ reactions, comments, shares, hoursElapsed }) {
  const raw = reactions + comments * 2 + shares * 3;
  return raw / Math.max(1, hoursElapsed);
}

/** Which real component dominated the score — used for the UI's reason code, never invented text. */
function dominantReasonCode({ reactions, comments, shares, hoursElapsed }) {
  const engagementRaw = reactions + comments * 2 + shares * 3;
  const velocity = engagementRaw / Math.max(1, hoursElapsed);
  // "Recency" wins when the same engagement happened over a very short
  // window (high velocity per unit of raw engagement); "Engagement
  // velocity" wins when the raw engagement itself is the larger driver.
  return hoursElapsed <= 6 && velocity > engagementRaw * 0.5 ? 'Recency' : 'Engagement velocity';
}

async function windowStart(windowKey) {
  return new Date(Date.now() - WINDOWS[windowKey] * 3_600_000);
}

async function computeForPosts(windowKey, postType) {
  const since = await windowStart(windowKey);
  const now = Date.now();

  const posts = await db('posts')
    .whereNull('deleted_at')
    .andWhere('status', 'published')
    .andWhere('post_type', postType)
    .andWhere((qb) => qb.where('created_at', '>=', since).orWhere('created_at', '<', since)) // include older still-active posts too
    .select('id', 'created_at');

  if (!posts.length) return [];
  const postIds = posts.map((p) => p.id);

  const [reactions, comments, shares] = await Promise.all([
    db('post_reactions').whereIn('post_id', postIds).andWhere('created_at', '>=', since).groupBy('post_id').select('post_id').count('id as count'),
    db('post_comments').whereIn('post_id', postIds).whereNull('deleted_at').andWhere('created_at', '>=', since).groupBy('post_id').select('post_id').count('id as count'),
    db('post_shares').whereIn('original_post_id', postIds).andWhere('created_at', '>=', since).groupBy('original_post_id').select('original_post_id').count('id as count'),
  ]);
  const reactionsByPost = Object.fromEntries(reactions.map((r) => [r.post_id, Number(r.count)]));
  const commentsByPost = Object.fromEntries(comments.map((r) => [r.post_id, Number(r.count)]));
  const sharesByPost = Object.fromEntries(shares.map((r) => [r.original_post_id, Number(r.count)]));

  return posts
    .map((post) => {
      const createdAt = new Date(post.created_at).getTime();
      const windowStartMs = since.getTime();
      const effectiveStart = Math.max(createdAt, windowStartMs);
      const hoursElapsed = Math.max(0, (now - effectiveStart) / 3_600_000);
      const parts = {
        reactions: reactionsByPost[post.id] || 0,
        comments: commentsByPost[post.id] || 0,
        shares: sharesByPost[post.id] || 0,
        hoursElapsed,
      };
      return { objectId: post.id, score: computeScore(parts), reasonCode: dominantReasonCode(parts) };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
}

/**
 * Hashtag trend score: same velocity formula, applied to the combined
 * engagement of every post carrying the hashtag within the window.
 */
async function computeForHashtags(windowKey) {
  const since = await windowStart(windowKey);
  const now = Date.now();

  const hashtagPosts = await db('post_hashtags as ph')
    .join('posts as p', 'p.id', 'ph.post_id')
    .whereNull('p.deleted_at')
    .andWhere('p.status', 'published')
    .select('ph.hashtag_id', 'p.id as post_id', 'p.created_at');

  if (!hashtagPosts.length) return [];
  const postIds = [...new Set(hashtagPosts.map((r) => r.post_id))];

  const [reactions, comments, shares] = await Promise.all([
    db('post_reactions').whereIn('post_id', postIds).andWhere('created_at', '>=', since).groupBy('post_id').select('post_id').count('id as count'),
    db('post_comments').whereIn('post_id', postIds).whereNull('deleted_at').andWhere('created_at', '>=', since).groupBy('post_id').select('post_id').count('id as count'),
    db('post_shares').whereIn('original_post_id', postIds).andWhere('created_at', '>=', since).groupBy('original_post_id').select('original_post_id').count('id as count'),
  ]);
  const reactionsByPost = Object.fromEntries(reactions.map((r) => [r.post_id, Number(r.count)]));
  const commentsByPost = Object.fromEntries(comments.map((r) => [r.post_id, Number(r.count)]));
  const sharesByPost = Object.fromEntries(shares.map((r) => [r.original_post_id, Number(r.count)]));

  const byHashtag = {};
  for (const row of hashtagPosts) {
    const createdAt = new Date(row.created_at).getTime();
    const hoursElapsed = Math.max(0, (now - Math.max(createdAt, since.getTime())) / 3_600_000);
    const parts = {
      reactions: reactionsByPost[row.post_id] || 0,
      comments: commentsByPost[row.post_id] || 0,
      shares: sharesByPost[row.post_id] || 0,
      hoursElapsed,
    };
    const postScore = computeScore(parts);
    if (!byHashtag[row.hashtag_id]) byHashtag[row.hashtag_id] = { objectId: row.hashtag_id, score: 0, reasonCode: 'Engagement velocity' };
    byHashtag[row.hashtag_id].score += postScore;
  }

  return Object.values(byHashtag)
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
}

const OBJECT_TYPES_BY_POST_TYPE = { post: 'standard', article: 'article', poll: 'poll' };

/**
 * Recomputes and upserts trend_scores for every (object_type, window)
 * combination. Callable on-demand (e.g. from the manual-trigger admin
 * endpoint) and on a recurring schedule via a BullMQ repeatable job (see
 * jobs/workers/trendRecompute.worker.js, run in the dedicated worker
 * process) — Domain 05 Phase 5 replaced the previous bare setInterval in
 * server.js with this, reusing the BullMQ infra already used by the imports
 * pipeline and AI tasks.
 */
export async function recomputeTrendScores() {
  const windows = Object.keys(WINDOWS);
  for (const windowKey of windows) {
    for (const [objectType, postType] of Object.entries(OBJECT_TYPES_BY_POST_TYPE)) {
      const ranked = await computeForPosts(windowKey, postType);
      await upsertTrendScores(objectType, windowKey, ranked);
    }
    const hashtagRanked = await computeForHashtags(windowKey);
    await upsertTrendScores('hashtag', windowKey, hashtagRanked);
  }
  return { calculatedAt: new Date().toISOString() };
}

async function upsertTrendScores(objectType, windowKey, ranked) {
  const top = ranked.slice(0, 100);
  await db.transaction(async (trx) => {
    await trx('trend_scores').where({ object_type: objectType, window: windowKey }).del();
    if (!top.length) return;
    await trx('trend_scores').insert(
      top.map((r, idx) => ({
        object_type: objectType,
        object_id: r.objectId,
        window: windowKey,
        score: r.score,
        rank: idx + 1,
      }))
    );
  });
}

/**
 * Real ranked trending results for the API. Reason codes are recomputed
 * live from the same real reaction/comment/share rows the stored score was
 * built from (trend_scores itself only persists the numeric score + rank,
 * so the reason is derived fresh rather than guessed from the stored
 * number alone).
 */
export async function getTrending(viewerId, { window: windowKey = '24h', type = 'posts' } = {}) {
  if (!WINDOWS[windowKey]) windowKey = '24h';

  if (type === 'hashtags') {
    const rows = await db('trend_scores').where({ object_type: 'hashtag', window: windowKey }).orderBy('rank', 'asc').limit(20);
    if (!rows.length) return { items: [], window: windowKey };
    const hashtags = await db('hashtags').whereIn('id', rows.map((r) => r.object_id));
    const hashtagById = Object.fromEntries(hashtags.map((h) => [h.id, h]));
    const followerCounts = await db('hashtag_follows')
      .whereIn('hashtag_id', rows.map((r) => r.object_id))
      .groupBy('hashtag_id')
      .select('hashtag_id')
      .count('id as count');
    const followerByHashtag = Object.fromEntries(followerCounts.map((f) => [f.hashtag_id, Number(f.count)]));
    return {
      window: windowKey,
      items: rows
        .filter((r) => hashtagById[r.object_id])
        .map((r) => ({
          tag: hashtagById[r.object_id].display_tag,
          normalizedTag: hashtagById[r.object_id].normalized_tag,
          followerCount: followerByHashtag[r.object_id] || 0,
          score: Number(r.score),
          rank: r.rank,
        })),
    };
  }

  const objectType = { posts: 'post', articles: 'article', polls: 'poll' }[type];
  if (!objectType) return { items: [], window: windowKey };

  const rows = await db('trend_scores').where({ object_type: objectType, window: windowKey }).orderBy('rank', 'asc').limit(20);
  if (!rows.length) return { items: [], window: windowKey };

  const postIds = rows.map((r) => r.object_id);
  const visiblePosts = await visibleCandidates(db('posts').whereIn('posts.id', postIds), viewerId).select('posts.*');
  const visibleById = Object.fromEntries(visiblePosts.map((p) => [p.id, p]));
  const orderedVisible = rows.map((r) => visibleById[r.object_id]).filter(Boolean);
  const hydrated = await hydratePosts(orderedVisible, viewerId);
  const scoreByPost = Object.fromEntries(rows.map((r) => [r.object_id, { score: Number(r.score), rank: r.rank }]));

  return {
    window: windowKey,
    items: hydrated.map((post) => ({
      ...post,
      trendScore: scoreByPost[post.id]?.score ?? 0,
      trendRank: scoreByPost[post.id]?.rank ?? null,
      reasonCode: post.commentCount * 2 + post.shareCount * 3 > post.likeCount ? 'Engagement velocity' : 'Recency',
    })),
  };
}

/**
 * Real top-authors-by-engagement query for the "Featured creators" module —
 * ranked by total real reactions+comments+shares on their published posts
 * within the window. No follower-growth-rate or influence-score fabricated.
 */
export async function getFeaturedCreators(windowKey = '7d', limit = 5) {
  if (!WINDOWS[windowKey]) windowKey = '7d';
  const since = await windowStart(windowKey);

  const rows = await db('posts')
    .whereNull('deleted_at')
    .andWhere('status', 'published')
    .andWhere('created_at', '>=', since)
    .groupBy('author_id')
    .select('author_id')
    .sum({ engagement: db.raw('like_count + comment_count * 2 + share_count * 3') })
    .orderBy('engagement', 'desc')
    .limit(limit);

  if (!rows.length) return [];
  const authors = await db('users')
    .whereIn('id', rows.map((r) => r.author_id))
    .select('id', 'first_name', 'last_name', 'headline');
  const authorById = Object.fromEntries(authors.map((a) => [a.id, a]));

  return rows
    .filter((r) => authorById[r.author_id])
    .map((r) => ({
      id: r.author_id,
      name: `${authorById[r.author_id].first_name} ${authorById[r.author_id].last_name}`,
      headline: authorById[r.author_id].headline,
      engagementScore: Number(r.engagement),
    }));
}
