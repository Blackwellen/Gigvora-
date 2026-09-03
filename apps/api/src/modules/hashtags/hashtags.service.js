import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { visibleCandidates, hydratePosts } from '../posts/posts.service.js';

const POST_TYPE_BY_CONTENT_TYPE = { posts: 'standard', articles: 'article', polls: 'poll' };

function normalizeTag(tag) {
  return String(tag || '').trim().replace(/^#/, '').toLowerCase();
}

async function getHashtagByNormalized(normalizedTag) {
  const hashtag = await db('hashtags').where({ normalized_tag: normalizedTag }).first();
  if (!hashtag) throw new AppError('Hashtag not found', 404);
  return hashtag;
}

function mapHashtag(row, extra = {}) {
  return {
    id: row.id,
    tag: row.display_tag,
    normalizedTag: row.normalized_tag,
    topicId: row.topic_id,
    createdAt: row.created_at,
    ...extra,
  };
}

/**
 * Hashtag header info: real follower count (hashtag_follows), and — if the
 * hashtag was ever attached to a curated topic row — its label/description.
 * There is no view-count/reach-tracking table for hashtags, so those numbers
 * are not produced.
 */
export async function getHashtagInfo(viewerId, tag) {
  const normalized = normalizeTag(tag);
  if (!normalized) throw new AppError('A hashtag is required', 422);
  const hashtag = await db('hashtags').where({ normalized_tag: normalized }).first();
  if (!hashtag) throw new AppError('Hashtag not found', 404);

  const [[{ count: followerCount }], viewerFollow, topic] = await Promise.all([
    db('hashtag_follows').where({ hashtag_id: hashtag.id }).count({ count: '*' }),
    viewerId ? db('hashtag_follows').where({ hashtag_id: hashtag.id, user_id: viewerId }).first('id') : null,
    hashtag.topic_id ? db('topics').where({ id: hashtag.topic_id }).first() : null,
  ]);

  return mapHashtag(hashtag, {
    followerCount: Number(followerCount),
    isFollowing: Boolean(viewerFollow),
    description: topic?.description || null,
    label: topic?.label || null,
  });
}

export async function followHashtag(userId, tag) {
  const hashtag = await getHashtagByNormalized(normalizeTag(tag));
  const existing = await db('hashtag_follows').where({ hashtag_id: hashtag.id, user_id: userId }).first('id');
  if (!existing) await db('hashtag_follows').insert({ hashtag_id: hashtag.id, user_id: userId });
}

export async function unfollowHashtag(userId, tag) {
  const hashtag = await getHashtagByNormalized(normalizeTag(tag));
  await db('hashtag_follows').where({ hashtag_id: hashtag.id, user_id: userId }).del();
}

/**
 * Paginated real posts/articles/polls carrying this hashtag. Joins
 * post_hashtags -> posts and reuses posts.service.js's exact visibility
 * filter (drafts/scheduled/visibility/negative-feedback) rather than
 * reimplementing it — a hashtag page must never leak a post the feed itself
 * would hide from this viewer.
 *
 * sort: 'top' ranks by real engagement (reactions + comments*2 + shares*3);
 * 'latest' by created_at.
 */
export async function listHashtagContent(viewerId, tag, { contentType = 'all', sort = 'top', search = '', cursor, limit = 10 } = {}) {
  const normalized = normalizeTag(tag);
  const hashtag = await db('hashtags').where({ normalized_tag: normalized }).first();
  if (!hashtag) throw new AppError('Hashtag not found', 404);

  const take = Math.min(Number(limit) || 10, 30);
  const offset = cursor ? Number(cursor) || 0 : 0;

  let query = visibleCandidates(
    db('posts').innerJoin('post_hashtags', 'post_hashtags.post_id', 'posts.id').where('post_hashtags.hashtag_id', hashtag.id),
    viewerId
  );

  if (contentType !== 'all') {
    const postType = POST_TYPE_BY_CONTENT_TYPE[contentType];
    if (!postType) throw new AppError('Invalid content type', 422);
    query = query.andWhere('posts.post_type', postType);
  }

  if (search?.trim()) {
    query = query.andWhere('posts.content', 'ilike', `%${search.trim()}%`);
  }

  if (sort === 'latest') {
    query = query.orderBy('posts.created_at', 'desc');
  } else {
    query = query.orderByRaw('(posts.like_count + posts.comment_count * 2 + posts.share_count * 3) desc').orderBy('posts.created_at', 'desc');
  }

  const rows = await query.select('posts.*').limit(take + 1).offset(offset);
  const hasMore = rows.length > take;
  const page = rows.slice(0, take);

  const items = await hydratePosts(page, viewerId);

  return { items, nextCursor: hasMore ? String(offset + take) : null };
}

/**
 * Topic insights rail: real counts only — posts in the last 30 days and
 * distinct contributor count over the same window. No growth percentage is
 * computed because there's no historical trend_scores snapshot per hashtag
 * yet to diff against (trending.service.js computes hashtag trend_scores
 * separately, on a rolling basis, not as a stored history per day).
 */
export async function getHashtagInsights(viewerId, tag) {
  const normalized = normalizeTag(tag);
  const hashtag = await db('hashtags').where({ normalized_tag: normalized }).first();
  if (!hashtag) throw new AppError('Hashtag not found', 404);

  const since30d = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const base = () =>
    visibleCandidates(
      db('posts').innerJoin('post_hashtags', 'post_hashtags.post_id', 'posts.id').where('post_hashtags.hashtag_id', hashtag.id),
      viewerId
    ).andWhere('posts.created_at', '>=', since30d);

  const [[{ count: posts30d }], contributors] = await Promise.all([
    base().count({ count: '*' }),
    base().countDistinct('posts.author_id as author_id'),
  ]);

  return {
    posts30d: Number(posts30d),
    contributorCount: Number(contributors[0]?.count || 0),
  };
}

/**
 * Related topics via real co-occurrence: other hashtags that appear on the
 * same posts as this one, ranked by how often they co-occur. Purely
 * derived from post_hashtags rows — no fabricated relevance score.
 */
export async function getRelatedHashtags(tag, limit = 5) {
  const normalized = normalizeTag(tag);
  const hashtag = await db('hashtags').where({ normalized_tag: normalized }).first();
  if (!hashtag) return [];

  const rows = await db('post_hashtags as ph1')
    .join('post_hashtags as ph2', 'ph2.post_id', 'ph1.post_id')
    .join('hashtags as h', 'h.id', 'ph2.hashtag_id')
    .where('ph1.hashtag_id', hashtag.id)
    .andWhere('ph2.hashtag_id', '!=', hashtag.id)
    .groupBy('h.id', 'h.display_tag', 'h.normalized_tag')
    .select('h.id', 'h.display_tag', 'h.normalized_tag')
    .count('ph2.post_id as co_occurrence')
    .orderBy('co_occurrence', 'desc')
    .limit(limit);

  if (!rows.length) return [];
  const followerCounts = await db('hashtag_follows')
    .whereIn(
      'hashtag_id',
      rows.map((r) => r.id)
    )
    .groupBy('hashtag_id')
    .select('hashtag_id')
    .count('id as count');
  const followerByHashtag = Object.fromEntries(followerCounts.map((f) => [f.hashtag_id, Number(f.count)]));

  return rows.map((r) => ({
    tag: r.display_tag,
    normalizedTag: r.normalized_tag,
    followerCount: followerByHashtag[r.id] || 0,
    coOccurrenceCount: Number(r.co_occurrence),
  }));
}

/**
 * Top contributors: authors with the most published posts carrying this
 * hashtag, ranked by real post count. No influence/quality score fabricated.
 */
export async function getTopContributors(viewerId, tag, limit = 5) {
  const normalized = normalizeTag(tag);
  const hashtag = await db('hashtags').where({ normalized_tag: normalized }).first();
  if (!hashtag) return [];

  const rows = await visibleCandidates(
    db('posts').innerJoin('post_hashtags', 'post_hashtags.post_id', 'posts.id').where('post_hashtags.hashtag_id', hashtag.id),
    viewerId
  )
    .groupBy('posts.author_id')
    .select('posts.author_id')
    .count('posts.id as post_count')
    .orderBy('post_count', 'desc')
    .limit(limit);

  if (!rows.length) return [];
  const authors = await db('users')
    .whereIn(
      'id',
      rows.map((r) => r.author_id)
    )
    .select('id', 'first_name', 'last_name', 'headline');
  const authorById = Object.fromEntries(authors.map((a) => [a.id, a]));

  return rows
    .filter((r) => authorById[r.author_id])
    .map((r) => ({
      id: r.author_id,
      name: `${authorById[r.author_id].first_name} ${authorById[r.author_id].last_name}`,
      headline: authorById[r.author_id].headline,
      postCount: Number(r.post_count),
    }));
}
