import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { notify } from '../notifications/notify.js';
import { recordActivity } from '../activity/activity.service.js';
import { scoreFeedCandidates, trainFeedRanker } from '../../common/ml/feedRankerClient.js';
import { bumpDailyMetric } from './postAnalytics.service.js';
import { publishFeedEvent, roomsForPostAudience } from '../../common/events/feedEvents.js';
import { screenContent } from '../../common/ml/moderationClient.js';
import { logMlInference } from '../../common/ml/mlInferenceLog.js';

const REACTION_TYPES = new Set(['like', 'celebrate', 'support', 'insightful', 'love', 'curious']);

function decayScore(createdAt, now = Date.now()) {
  const hours = Math.max(0, (now - new Date(createdAt).getTime()) / 3_600_000);
  return 1 / (1 + hours / 24);
}

/**
 * Visibility + workspace-scoped candidate query. Authorization always
 * happens here, before any ranking — the ranker only reorders posts the
 * viewer is already allowed to see.
 *
 * Also enforces: drafts are never visible to anyone but their author,
 * future-scheduled posts are never visible to anyone but their author, and
 * a viewer's real, persisted negative-feedback (hidden authors / dismissed
 * posts / hidden topics — feed_negative_feedback) is honoured here so
 * "Not interested"/"Hide author"/"Hide topic" actually change what the
 * server returns rather than just hiding rows client-side.
 */
export function visibleCandidates(qb, viewerId) {
  return qb
    .whereNull('posts.deleted_at')
    .andWhere((statusQb) => statusQb.where('posts.status', 'published').orWhere('posts.author_id', viewerId))
    .andWhere((scheduleQb) =>
      scheduleQb.whereNull('posts.scheduled_at').orWhere('posts.scheduled_at', '<=', db.fn.now()).orWhere('posts.author_id', viewerId)
    )
    .andWhere((outer) =>
      outer
        .where('posts.visibility', 'public')
        .orWhere('posts.author_id', viewerId)
        .orWhere((connectionsQb) =>
          connectionsQb
            .where('posts.visibility', 'connections')
            .whereExists(function connectionExists() {
              this.select(1)
                .from('connections')
                .where('status', 'accepted')
                .andWhere((c) =>
                  c
                    .where({ requester_id: viewerId, addressee_id: db.raw('posts.author_id') })
                    .orWhere({ addressee_id: viewerId, requester_id: db.raw('posts.author_id') })
                );
            })
        )
    )
    .andWhere((qb2) =>
      qb2
        .whereNotExists(function notInterested() {
          this.select(1)
            .from('feed_negative_feedback as fnf')
            .whereRaw('fnf.post_id = posts.id')
            .andWhere('fnf.user_id', viewerId)
            .andWhere('fnf.feedback_type', 'not_interested');
        })
        .whereNotExists(function hiddenAuthor() {
          this.select(1)
            .from('feed_negative_feedback as fnf2')
            .whereRaw('fnf2.author_id = posts.author_id')
            .andWhere('fnf2.user_id', viewerId)
            .andWhere('fnf2.feedback_type', 'hide_author');
        })
        .whereNotExists(function hiddenTopic() {
          this.select(1)
            .from('feed_negative_feedback as fnf3')
            .where('fnf3.user_id', viewerId)
            .andWhere('fnf3.feedback_type', 'hide_topic')
            // jsonb "?" containment operator (does fnf3.topic appear as an
            // element of posts.topics) — escaped as "\?" so knex doesn't
            // treat it as a positional-binding placeholder.
            .andWhereRaw('posts.topics \\? fnf3.topic');
        })
    );
}

export async function hydratePosts(rows, viewerId) {
  if (!rows.length) return [];
  const postIds = rows.map((r) => r.id);

  const [authors, attachments, myReactions, myPolls, savedRows] = await Promise.all([
    db('users')
      .whereIn(
        'id',
        rows.map((r) => r.author_id)
      )
      .select('id', 'first_name', 'last_name', 'headline', 'account_type'),
    db('post_attachments').whereIn('post_id', postIds).orderBy('order_index', 'asc'),
    db('post_reactions').whereIn('post_id', postIds).andWhere({ actor_person_id: viewerId }),
    db('polls as p')
      .whereIn('p.post_id', postIds)
      .leftJoin('poll_options as po', 'po.poll_id', 'p.id')
      .leftJoin('poll_votes as pv', function j() {
        this.on('pv.option_id', '=', 'po.id');
      })
      .select('p.id as poll_id', 'p.post_id', 'p.question', 'p.multiple_choice', 'po.id as option_id', 'po.label', 'po.order_index', 'pv.person_id'),
    db('saved_items').whereIn('object_id', postIds).andWhere({ user_id: viewerId, object_type: 'post' }),
  ]);

  const authorById = Object.fromEntries(authors.map((a) => [a.id, a]));
  const attachmentsByPost = groupBy(attachments, 'post_id');
  const myReactionByPost = Object.fromEntries(myReactions.map((r) => [r.post_id, r.reaction_type]));
  const savedSet = new Set(savedRows.map((s) => s.object_id));

  const pollsByPost = {};
  for (const row of myPolls) {
    if (!pollsByPost[row.post_id]) {
      pollsByPost[row.post_id] = { id: row.poll_id, question: row.question, multipleChoice: row.multiple_choice, options: [], totalVotes: 0, myVotes: [] };
    }
    const poll = pollsByPost[row.post_id];
    if (row.option_id && !poll.options.find((o) => o.id === row.option_id)) {
      poll.options.push({ id: row.option_id, label: row.label, orderIndex: row.order_index, voteCount: 0 });
    }
  }
  for (const row of myPolls) {
    if (!row.option_id || !row.person_id) continue;
    const poll = pollsByPost[row.post_id];
    const option = poll.options.find((o) => o.id === row.option_id);
    if (option) option.voteCount += 1;
    poll.totalVotes += 1;
    if (row.person_id === viewerId) poll.myVotes.push(row.option_id);
  }
  Object.values(pollsByPost).forEach((p) => p.options.sort((a, b) => a.orderIndex - b.orderIndex));

  return rows.map((row) => {
    const author = authorById[row.author_id];
    return {
      id: row.id,
      authorId: row.author_id,
      author: author
        ? { id: author.id, name: `${author.first_name} ${author.last_name}`, headline: author.headline, accountType: author.account_type }
        : null,
      body: row.content,
      postType: row.post_type,
      visibility: row.visibility,
      companyId: row.company_id,
      isPinned: row.is_pinned,
      likeCount: row.like_count,
      commentCount: row.comment_count,
      shareCount: row.share_count,
      createdAt: row.created_at,
      editedAt: row.edited_at,
      sharedFromPostId: row.shared_from_post_id,
      status: row.status,
      scheduledAt: row.scheduled_at,
      topics: Array.isArray(row.topics) ? row.topics : [],
      attachments: (attachmentsByPost[row.id] || []).map((a) => ({
        id: a.id,
        type: a.attachment_type,
        url: a.url,
        fileName: a.file_name,
        fileSize: a.file_size,
        metadata: a.metadata,
      })),
      poll: pollsByPost[row.id] || null,
      myReaction: myReactionByPost[row.id] || null,
      isSaved: savedSet.has(row.id),
    };
  });
}

function groupBy(rows, key) {
  return rows.reduce((acc, row) => {
    (acc[row[key]] ||= []).push(row);
    return acc;
  }, {});
}

/**
 * feed_ranker v0 (deterministic, model_registry-tracked). Candidates are
 * fetched pre-filtered by visibility, then ranked by a weighted blend of
 * recency decay and engagement velocity. Replaced by a learned model once
 * there's enough labelled interaction data (see model_registry).
 */
export async function listFeed(viewerId, { tab = 'top', cursor, limit = 10 } = {}) {
  const take = Math.min(Number(limit) || 10, 30);

  if (tab === 'following') {
    const followingIds = (await db('follows').where({ follower_id: viewerId }).select('following_id')).map((f) => f.following_id);
    const query = db('posts').whereIn('author_id', [...followingIds, viewerId]);
    return paginateChronological(visibleCandidates(query, viewerId), viewerId, cursor, take);
  }

  if (tab === 'mine') {
    const query = db('posts').where({ author_id: viewerId }).whereNull('deleted_at');
    return paginateChronological(query, viewerId, cursor, take);
  }

  if (tab === 'latest') {
    return paginateChronological(visibleCandidates(db('posts'), viewerId), viewerId, cursor, take);
  }

  if (tab === 'network') {
    // 1st-degree connections' activity — the real connections graph, not
    // "everyone", so this differs from Latest/Top even after visibility
    // filtering: only posts authored by an accepted connection (or the
    // viewer) are candidates at all.
    const connectionAuthorIds = (
      await db('connections')
        .where('status', 'accepted')
        .andWhere((qb) => qb.where({ requester_id: viewerId }).orWhere({ addressee_id: viewerId }))
        .select('requester_id', 'addressee_id')
    ).flatMap((c) => [c.requester_id, c.addressee_id]);
    const authorIds = [...new Set([...connectionAuthorIds, viewerId])];
    const query = db('posts').whereIn('author_id', authorIds);
    return paginateChronological(visibleCandidates(query, viewerId), viewerId, cursor, take);
  }

  // "top" and "recommended" — rank a recent candidate window
  // deterministically, then paginate the ranked list via an offset cursor
  // (acceptable at current data volume; flagged for a proper
  // feature-store-backed ranker as volume grows). "recommended" reuses the
  // exact same ranking pipeline as "top" — visibleCandidates() already
  // excludes anything covered by the viewer's persisted negative feedback
  // (hidden authors / dismissed posts / hidden topics), which is what makes
  // it distinct from Top in practice once a viewer has given feedback.
  const offset = cursor ? Number(cursor) || 0 : 0;
  const candidates = await visibleCandidates(db('posts'), viewerId)
    .orderBy('created_at', 'desc')
    .limit(300);

  const connectionIds = new Set(
    (
      await db('connections')
        .where('status', 'accepted')
        .andWhere((qb) => qb.where({ requester_id: viewerId }).orWhere({ addressee_id: viewerId }))
        .select('requester_id', 'addressee_id')
    ).flatMap((c) => [c.requester_id, c.addressee_id])
  );

  const now = Date.now();
  const authorAffinity = await getAuthorAffinity(viewerId, candidates.map((c) => c.author_id));

  const deterministicScored = candidates
    .map((post) => {
      const engagement = post.like_count * 1 + post.comment_count * 2 + post.share_count * 3;
      const relationshipBoost = connectionIds.has(post.author_id) || post.author_id === viewerId ? 1.4 : 1;
      const pinBoost = post.is_pinned ? 1.5 : 1;
      const score = (1 + engagement) * decayScore(post.created_at, now) * relationshipBoost * pinBoost;
      return { post, score };
    })
    .sort((a, b) => b.score - a.score);

  // Only send the ML service the pre-ranked top window (keeps payload small
  // and cheap); a null/degraded response means "not ready yet" — fall back
  // to the deterministic order untouched.
  const mlWindow = deterministicScored.slice(0, 60);
  const mlResult = await scoreFeedCandidates(
    viewerId,
    mlWindow.map(({ post }) => ({ post_id: post.id, ...buildFeedFeatures(post, viewerId, { connectionIds, authorAffinity, now }) }))
  );

  let rankedByModel = { model: 'feed_ranker', version: 'v0-deterministic' };
  let finalOrder = deterministicScored.map((s) => s.post);

  if (mlResult) {
    const scoreByPostId = Object.fromEntries(mlResult.scores.map((s) => [s.post_id, s.score]));
    const reranked = [...mlWindow].sort((a, b) => (scoreByPostId[b.post.id] ?? 0) - (scoreByPostId[a.post.id] ?? 0));
    finalOrder = [...reranked.map((s) => s.post), ...deterministicScored.slice(60).map((s) => s.post)];
    rankedByModel = { model: mlResult.model_name, version: mlResult.model_version };
  }

  const page = finalOrder.slice(offset, offset + take);
  const hydrated = await hydratePosts(page, viewerId);
  return { items: hydrated, nextCursor: offset + take < finalOrder.length ? String(offset + take) : null, rankedBy: rankedByModel };
}

async function getAuthorAffinity(viewerId, authorIds) {
  const uniqueAuthors = [...new Set(authorIds)];
  if (!uniqueAuthors.length) return {};

  const [reactions, comments] = await Promise.all([
    db('post_reactions as r')
      .join('posts as p', 'p.id', 'r.post_id')
      .where('r.actor_person_id', viewerId)
      .whereIn('p.author_id', uniqueAuthors)
      .groupBy('p.author_id')
      .select('p.author_id')
      .count('r.id as count'),
    db('post_comments as c')
      .join('posts as p', 'p.id', 'c.post_id')
      .where('c.author_id', viewerId)
      .whereIn('p.author_id', uniqueAuthors)
      .groupBy('p.author_id')
      .select('p.author_id')
      .count('c.id as count'),
  ]);

  const reactionByAuthor = Object.fromEntries(reactions.map((r) => [r.author_id, Number(r.count)]));
  const commentByAuthor = Object.fromEntries(comments.map((c) => [c.author_id, Number(c.count)]));

  return Object.fromEntries(
    uniqueAuthors.map((id) => [
      id,
      { reaction: Math.min((reactionByAuthor[id] || 0) / 5, 1), comment: Math.min((commentByAuthor[id] || 0) / 5, 1) },
    ])
  );
}

function buildFeedFeatures(post, viewerId, { connectionIds, authorAffinity, now = Date.now() }) {
  const affinity = authorAffinity[post.author_id] || { reaction: 0, comment: 0 };
  return {
    age_hours: Math.max(0, (now - new Date(post.created_at).getTime()) / 3_600_000),
    reaction_count: post.like_count,
    comment_count: post.comment_count,
    share_count: post.share_count,
    is_pinned: Boolean(post.is_pinned),
    is_connection_or_self: connectionIds.has(post.author_id) || post.author_id === viewerId,
    is_own_post: post.author_id === viewerId,
    author_reaction_affinity: affinity.reaction,
    author_comment_affinity: affinity.comment,
  };
}

/**
 * Sends one real (features, label) example to the online feed_ranker so it
 * updates immediately. Fire-and-forget — never blocks or fails the caller's
 * action if the ML service is unavailable.
 */
async function queueFeedRankerTraining(viewerId, postId, label) {
  const post = await db('posts').where({ id: postId }).first('id', 'author_id', 'created_at', 'like_count', 'comment_count', 'share_count', 'is_pinned');
  if (!post) return;
  const isSelf = post.author_id === viewerId;
  const isConnection =
    !isSelf &&
    Boolean(
      await db('connections')
        .where('status', 'accepted')
        .andWhere((qb) =>
          qb.where({ requester_id: viewerId, addressee_id: post.author_id }).orWhere({ addressee_id: viewerId, requester_id: post.author_id })
        )
        .first()
    );
  const affinity = await getAuthorAffinity(viewerId, [post.author_id]);
  const features = buildFeedFeatures(post, viewerId, {
    connectionIds: new Set(isConnection ? [post.author_id] : []),
    authorAffinity: affinity,
  });
  trainFeedRanker({ viewer_id: viewerId, post_id: postId, label, features: { post_id: postId, ...features } });
}

async function paginateChronological(queryBuilder, viewerId, cursor, take) {
  let query = queryBuilder.clone();
  if (cursor) {
    const [createdAt, id] = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
    query = query.andWhere((qb) =>
      qb.where('posts.created_at', '<', createdAt).orWhere((inner) => inner.where('posts.created_at', createdAt).andWhere('posts.id', '<', id))
    );
  }
  const rows = await query.orderBy('posts.created_at', 'desc').orderBy('posts.id', 'desc').limit(take + 1);
  const hasMore = rows.length > take;
  const page = rows.slice(0, take);
  const hydrated = await hydratePosts(page, viewerId);
  const last = page[page.length - 1];
  const nextCursor = hasMore && last ? Buffer.from(JSON.stringify([last.created_at, last.id])).toString('base64') : null;
  return { items: hydrated, nextCursor };
}

export async function getPostById(viewerId, postId) {
  const row = await visibleCandidates(db('posts').where('posts.id', postId), viewerId).first();
  if (!row) throw new AppError('Post not found', 404);
  const [hydrated] = await hydratePosts([row], viewerId);
  return hydrated;
}

/**
 * Owner-only fetch used by Edit Post — bypasses the feed-visibility
 * filtering in visibleCandidates() (which hides drafts/future-scheduled/
 * negative-feedback rows) so an author can always load their own post to
 * edit it, but still enforces ownership server-side.
 */
/**
 * Deterministic, real-data-only counts for the Following Feed's "AI Feed
 * Summary" rail — no LLM call, no fabricated numbers. Every number here is
 * a direct count against the real follows/posts tables.
 */
export async function getFollowingFeedSummary(viewerId) {
  const followingIds = (await db('follows').where({ follower_id: viewerId }).select('following_id')).map((f) => f.following_id);
  if (!followingIds.length) return { followingCount: 0, newPostsToday: 0 };

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [{ count }] = await visibleCandidates(
    db('posts').whereIn('author_id', followingIds).andWhere('posts.created_at', '>=', startOfDay),
    viewerId
  ).count({ count: '*' });

  return { followingCount: followingIds.length, newPostsToday: Number(count) };
}

/**
 * Deterministic, real-data-only counts for the Network Feed's rail. Only
 * counts that have a real backing table are returned — there is no
 * profile-view or impression-tracking table in this schema, so those
 * numbers are simply not produced (the page omits them rather than
 * fabricating them).
 */
export async function getNetworkFeedSummary(viewerId) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const baseWhere = (qb) => qb.where({ requester_id: viewerId }).orWhere({ addressee_id: viewerId });

  const [[{ count: total }], [{ count: recent }]] = await Promise.all([
    db('connections').where('status', 'accepted').andWhere(baseWhere).count({ count: '*' }),
    db('connections').where('status', 'accepted').andWhere('created_at', '>=', sevenDaysAgo).andWhere(baseWhere).count({ count: '*' }),
  ]);

  return { totalConnections: Number(total), newConnectionsLast7Days: Number(recent) };
}

export async function getOwnedPostById(userId, postId) {
  const row = await db('posts').where({ id: postId }).whereNull('deleted_at').first();
  if (!row) throw new AppError('Post not found', 404);
  if (row.author_id !== userId) throw new AppError('You can only edit your own posts', 403);
  const [hydrated] = await hydratePosts([row], userId);
  return hydrated;
}

const POST_STATUSES = new Set(['draft', 'published']);

export async function createPost(
  authorId,
  { body, visibility = 'public', companyId, attachments = [], poll, mentions = [], topics = [], status = 'published', scheduledAt = null } = {}
) {
  if (!POST_STATUSES.has(status)) throw new AppError('Invalid post status', 422);
  // Drafts (autosave) are allowed to be empty — Create Post starts a draft
  // row before the author has typed anything. Anything being published must
  // have real content.
  if (status === 'published' && !body?.trim() && !attachments.length && !poll) {
    throw new AppError('Post must have content, an attachment, or a poll', 422);
  }
  if (companyId) {
    const membership = await db('company_members').where({ company_id: companyId, user_id: authorId, status: 'active' }).first();
    if (!membership) throw new AppError('You do not have access to this workspace', 403);
  }
  if (!['public', 'connections', 'private'].includes(visibility)) throw new AppError('Invalid visibility', 422);

  const scheduledAtValue = normalizeScheduledAt(scheduledAt);
  const isFutureScheduled = status === 'published' && scheduledAtValue && scheduledAtValue.getTime() > Date.now();

  // Synchronous, short-timeout, fail-open moderation screen — same
  // resilience contract as feedRankerClient.js (a slow/down ML service must
  // never break posting). Only screens content that's actually about to go
  // live now; a draft autosave has nothing to screen yet, and a
  // future-scheduled post is screened again at actual publish time by
  // scheduledPosts.worker.js (content — and moderation policy — can change
  // between now and scheduled_at).
  let effectiveStatus = status;
  let moderationResult = null;
  if (status === 'published' && !isFutureScheduled) {
    moderationResult = await screenContent({ text: body || '', authorId, objectType: 'post' });
    if (moderationResult?.label === 'hold_for_review') effectiveStatus = 'under_review';
  } else if (isFutureScheduled) {
    // Not live yet — 'scheduled' keeps it out of every other viewer's feed
    // (visibleCandidates only allows non-'published' status through for the
    // author) until scheduledPosts.worker.js flips it at scheduled_at.
    effectiveStatus = 'scheduled';
  }

  return db.transaction(async (trx) => {
    const [post] = await trx('posts')
      .insert({
        author_id: authorId,
        content: body || '',
        visibility,
        company_id: companyId || null,
        post_type: poll ? 'poll' : 'standard',
        media: '[]',
        status: effectiveStatus,
        scheduled_at: scheduledAtValue,
        topics: JSON.stringify(sanitizeTopics(topics)),
      })
      .returning('*');

    if (effectiveStatus === 'under_review') {
      await trx('content_moderation_actions').insert({
        object_type: 'post',
        object_id: post.id,
        action: 'held',
        reason: (moderationResult.reason_codes || []).join(', '),
        actor_type: 'system',
      });
    }

    await syncPostHashtags(trx, post.id, sanitizeTopics(topics));

    if (attachments.length) {
      await trx('post_attachments').insert(
        attachments.map((a, idx) => ({
          post_id: post.id,
          attachment_type: a.type,
          url: a.url,
          file_name: a.fileName || null,
          file_size: a.fileSize || null,
          metadata: JSON.stringify(a.metadata || {}),
          order_index: idx,
        }))
      );
    }

    if (poll?.question && Array.isArray(poll.options) && poll.options.length >= 2) {
      const [pollRow] = await trx('polls')
        .insert({ post_id: post.id, question: poll.question, multiple_choice: Boolean(poll.multipleChoice), ends_at: poll.endsAt || null })
        .returning('*');
      await trx('poll_options').insert(poll.options.map((label, idx) => ({ poll_id: pollRow.id, label, order_index: idx })));
    }

    if (mentions.length) {
      await trx('post_mentions')
        .insert(mentions.map((userId) => ({ post_id: post.id, mentioned_user_id: userId })))
        .onConflict(['post_id', 'mentioned_user_id'])
        .ignore();
    }

    return post;
  }).then(async (post) => {
    if (moderationResult) {
      logMlInference({ objectType: 'post', objectId: post.id, modelName: 'moderation-screen', modelVersion: moderationResult.model_version, actorId: authorId, output: moderationResult }).catch(() => {});
    }
    // Never announce a draft (or a not-yet-due scheduled post) in the
    // activity feed — only a real, currently-live publish.
    if (post.status === 'published') {
      await recordActivity({ actorUserId: authorId, verb: 'created', objectType: 'post', objectId: post.id, visibility: 'public', context: { preview: (post.content || '').slice(0, 120) } });
      const rooms = await roomsForPostAudience(authorId, post.visibility);
      await publishFeedEvent('feed:new_candidates', { postId: post.id, authorId }, rooms);
    }
    return post;
  });
}

function normalizeScheduledAt(scheduledAt) {
  if (!scheduledAt) return null;
  const date = new Date(scheduledAt);
  if (Number.isNaN(date.getTime())) throw new AppError('Invalid scheduled_at', 422);
  if (date.getTime() <= Date.now()) throw new AppError('scheduled_at must be in the future', 422);
  return date;
}

function sanitizeTopics(topics) {
  if (!Array.isArray(topics)) return [];
  return [...new Set(topics.map((t) => String(t).trim().replace(/^#/, '')).filter(Boolean))].slice(0, 10);
}

/**
 * Keeps the formal hashtag taxonomy (hashtags/post_hashtags) in sync with a
 * post's plain-tag `topics` array. Only hashtag-looking tags (letters,
 * digits, underscore — same rule the backfill migration used) become real
 * hashtag rows; anything else in `topics` is left as a plain tag with no
 * taxonomy entry. Idempotent: re-running with the same topics is a no-op.
 */
export async function syncPostHashtags(trx, postId, topics) {
  const displayTags = [...new Set(topics.map((t) => String(t).trim()).filter(Boolean))];
  const hashtagIds = [];
  for (const displayTag of displayTags) {
    const normalized = displayTag.toLowerCase();
    if (!/^[a-z0-9_-]+$/.test(normalized)) continue;
    let hashtag = await trx('hashtags').where({ normalized_tag: normalized }).first('id');
    if (!hashtag) {
      [hashtag] = await trx('hashtags').insert({ normalized_tag: normalized, display_tag: displayTag }).returning('id');
    }
    hashtagIds.push(hashtag.id);
  }

  await trx('post_hashtags').where({ post_id: postId }).whereNotIn('hashtag_id', hashtagIds.length ? hashtagIds : ['00000000-0000-0000-0000-000000000000']).del();
  if (hashtagIds.length) {
    await trx('post_hashtags')
      .insert(hashtagIds.map((hashtagId) => ({ post_id: postId, hashtag_id: hashtagId })))
      .onConflict(['post_id', 'hashtag_id'])
      .ignore();
  }
}

/**
 * Backs three real flows with one function: Create Post's debounced
 * draft-autosave PATCH, the Publish/Schedule action (status: 'draft' ->
 * 'published'), and Edit Post's full edit of an already-published post.
 * Every field is optional/undefined-skipped so a partial PATCH only
 * touches what it sends. Ownership is enforced server-side regardless of
 * what the client claims.
 */
export async function updatePost(userId, postId, { body, visibility, companyId, attachments, poll, topics, status, scheduledAt } = {}) {
  const post = await db('posts').where({ id: postId }).first();
  if (!post || post.deleted_at) throw new AppError('Post not found', 404);
  if (post.author_id !== userId) throw new AppError('You can only edit your own posts', 403);

  if (companyId !== undefined && companyId) {
    const membership = await db('company_members').where({ company_id: companyId, user_id: userId, status: 'active' }).first();
    if (!membership) throw new AppError('You do not have access to this workspace', 403);
  }
  if (visibility !== undefined && !['public', 'connections', 'private'].includes(visibility)) {
    throw new AppError('Invalid visibility', 422);
  }
  if (status !== undefined && !POST_STATUSES.has(status)) throw new AppError('Invalid post status', 422);

  const wasDraft = post.status === 'draft';
  const isPublishing = wasDraft && status === 'published';

  if (isPublishing) {
    // Validate against the *effective* post, not just whatever this PATCH
    // happened to include — Publish is typically its own call with only
    // { status: 'published' }, after body/attachments were already saved by
    // earlier autosave PATCHes, so falling back to what's already on the
    // row (rather than treating an omitted field as empty) avoids rejecting
    // a perfectly real, already-drafted post.
    const effectiveBody = body !== undefined ? body : post.content;
    const effectiveAttachmentCount =
      attachments !== undefined ? attachments.length : Number((await db('post_attachments').where({ post_id: postId }).count({ count: '*' }).first())?.count || 0);
    const hasPoll = poll || post.post_type === 'poll';
    if (!effectiveBody?.trim() && !effectiveAttachmentCount && !hasPoll) {
      throw new AppError('Post must have content, an attachment, or a poll before publishing', 422);
    }
  }

  const scheduledAtValue = scheduledAt !== undefined ? normalizeScheduledAt(scheduledAt) : undefined;
  const effectiveScheduledAt = scheduledAtValue !== undefined ? scheduledAtValue : post.scheduled_at;
  const isFutureScheduled = isPublishing && effectiveScheduledAt && new Date(effectiveScheduledAt).getTime() > Date.now();

  // Same synchronous, fail-open moderation screen as createPost — only run
  // at the moment a draft actually goes live now; a future-scheduled post is
  // screened again at actual publish time by scheduledPosts.worker.js.
  let moderationResult = null;
  let effectiveStatus = status;
  if (isPublishing && !isFutureScheduled) {
    const effectiveBody = body !== undefined ? body : post.content;
    moderationResult = await screenContent({ text: effectiveBody || '', authorId: userId, objectType: 'post' });
    if (moderationResult?.label === 'hold_for_review') effectiveStatus = 'under_review';
  } else if (isFutureScheduled) {
    effectiveStatus = 'scheduled';
  }

  const patch = { updated_at: db.fn.now() };
  if (body !== undefined) patch.content = body;
  if (visibility !== undefined) patch.visibility = visibility;
  if (companyId !== undefined) patch.company_id = companyId || null;
  if (topics !== undefined) patch.topics = JSON.stringify(sanitizeTopics(topics));
  if (status !== undefined) patch.status = effectiveStatus;
  if (scheduledAtValue !== undefined) patch.scheduled_at = scheduledAtValue;
  // A real, substantive edit to an already-published post gets an
  // edited_at timestamp (shown on the post); draft autosave never does —
  // there's nothing "edited" about a post that was never public.
  if (!wasDraft && body !== undefined) patch.edited_at = db.fn.now();
  // Publishing a draft is when it actually becomes visible — treat that
  // moment as its creation time for feed ordering, same as any other post.
  // A future-scheduled post isn't visible yet, so its ordering timestamp is
  // set for real when scheduledPosts.worker.js actually publishes it.
  if (isPublishing && !isFutureScheduled) patch.created_at = db.fn.now();

  return db.transaction(async (trx) => {
    const [updated] = await trx('posts').where({ id: postId }).update(patch).returning('*');

    if (topics !== undefined) await syncPostHashtags(trx, postId, sanitizeTopics(topics));

    if (attachments !== undefined) {
      await trx('post_attachments').where({ post_id: postId }).del();
      if (attachments.length) {
        await trx('post_attachments').insert(
          attachments.map((a, idx) => ({
            post_id: postId,
            attachment_type: a.type,
            url: a.url,
            file_name: a.fileName || null,
            file_size: a.fileSize || null,
            metadata: JSON.stringify(a.metadata || {}),
            order_index: idx,
          }))
        );
      }
    }

    if (isPublishing && effectiveStatus === 'under_review') {
      await trx('content_moderation_actions').insert({
        object_type: 'post',
        object_id: postId,
        action: 'held',
        reason: (moderationResult.reason_codes || []).join(', '),
        actor_type: 'system',
      });
    }

    return updated;
  }).then(async (updated) => {
    if (moderationResult) {
      logMlInference({ objectType: 'post', objectId: updated.id, modelName: 'moderation-screen', modelVersion: moderationResult.model_version, actorId: userId, output: moderationResult }).catch(() => {});
    }
    if (isPublishing && updated.status === 'published') {
      await recordActivity({ actorUserId: userId, verb: 'created', objectType: 'post', objectId: updated.id, visibility: 'public', context: { preview: (updated.content || '').slice(0, 120) } });
      const rooms = await roomsForPostAudience(userId, updated.visibility);
      await publishFeedEvent('feed:new_candidates', { postId: updated.id, authorId: userId }, rooms);
    }
    return updated;
  });
}

export async function deletePost(userId, postId) {
  const post = await db('posts').where({ id: postId }).first();
  if (!post || post.deleted_at) throw new AppError('Post not found', 404);
  if (post.author_id !== userId) throw new AppError('You can only delete your own posts', 403);
  await db('posts').where({ id: postId }).update({ deleted_at: db.fn.now() });
  await publishFeedEvent('post:deleted', { postId }, [`post:${postId}`]);
}

export async function reactToPost(userId, postId, reactionType) {
  if (!REACTION_TYPES.has(reactionType)) throw new AppError('Invalid reaction type', 422);
  const post = await db('posts').where({ id: postId }).first();
  if (!post || post.deleted_at) throw new AppError('Post not found', 404);

  const isNewReaction = await db.transaction(async (trx) => {
    const existing = await trx('post_reactions').where({ post_id: postId, actor_person_id: userId }).first();
    if (existing) {
      await trx('post_reactions').where({ id: existing.id }).update({ reaction_type: reactionType, updated_at: trx.fn.now() });
      return false;
    }
    await trx('post_reactions').insert({ post_id: postId, actor_person_id: userId, reaction_type: reactionType });
    await trx('posts').where({ id: postId }).increment('like_count', 1);
    return true;
  });

  if (isNewReaction) {
    const actor = await db('users').where({ id: userId }).first('first_name', 'last_name');
    await notify({
      userId: post.author_id,
      actorId: userId,
      type: 'post.reaction',
      payload: { actorName: actor ? `${actor.first_name} ${actor.last_name}` : 'Someone', postId, reactionType, deepLink: `/app/post-detail/${postId}` },
    });
    queueFeedRankerTraining(userId, postId, 1).catch(() => {});
    bumpDailyMetric(postId, 'reactions', 1).catch(() => {});
  }

  const fresh = await db('posts').where({ id: postId }).first('like_count');
  await publishFeedEvent('post:reaction_updated', { postId, likeCount: fresh?.like_count ?? 0, reactionType, actorId: userId }, [`post:${postId}`]);

  return { reactionType };
}

export async function removeReaction(userId, postId) {
  const removed = await db.transaction(async (trx) => {
    const count = await trx('post_reactions').where({ post_id: postId, actor_person_id: userId }).del();
    if (count) await trx('posts').where({ id: postId }).decrement('like_count', 1);
    return count > 0;
  });
  if (removed) {
    queueFeedRankerTraining(userId, postId, 0).catch(() => {});
    bumpDailyMetric(postId, 'reactions', -1).catch(() => {});
    const fresh = await db('posts').where({ id: postId }).first('like_count');
    await publishFeedEvent('post:reaction_updated', { postId, likeCount: fresh?.like_count ?? 0, reactionType: null, actorId: userId }, [`post:${postId}`]);
  }
}

export async function listComments(postId, { parentCommentId = null, limit = 20, offset = 0, viewerId = null } = {}) {
  const rows = await db('post_comments')
    .where({ post_id: postId, parent_comment_id: parentCommentId })
    .whereNull('deleted_at')
    // A comment held for moderation ('under_review') is hidden from every
    // other viewer's thread — same contract as posts/articles — but its own
    // author still sees it (with a pending-review indicator) so they know
    // their comment wasn't silently dropped.
    .andWhere((statusQb) => {
      statusQb.where('status', 'published');
      if (viewerId) statusQb.orWhere({ status: 'under_review', author_id: viewerId });
    })
    .orderBy('created_at', 'asc')
    .limit(limit)
    .offset(offset);

  if (!rows.length) return [];

  const authorIds = [...new Set(rows.map((r) => r.author_id))];
  const commentIds = rows.map((r) => r.id);
  const [authors, replyCounts, reactionRows, viewerReactions] = await Promise.all([
    db('users').whereIn('id', authorIds).select('id', 'first_name', 'last_name', 'headline'),
    db('post_comments').whereIn('parent_comment_id', commentIds).whereNull('deleted_at').where('status', 'published').groupBy('parent_comment_id').select('parent_comment_id').count('id as count'),
    db('comment_reactions').whereIn('comment_id', commentIds).select('comment_id').count('id as count').groupBy('comment_id'),
    viewerId ? db('comment_reactions').whereIn('comment_id', commentIds).andWhere({ actor_person_id: viewerId }).select('comment_id', 'reaction_type') : Promise.resolve([]),
  ]);
  const authorById = Object.fromEntries(authors.map((a) => [a.id, a]));
  const replyCountByParent = Object.fromEntries(replyCounts.map((r) => [r.parent_comment_id, Number(r.count)]));
  const reactionCountByComment = Object.fromEntries(reactionRows.map((r) => [r.comment_id, Number(r.count)]));
  const viewerReactionByComment = Object.fromEntries(viewerReactions.map((r) => [r.comment_id, r.reaction_type]));

  return rows.map((row) => ({
    id: row.id,
    postId: row.post_id,
    parentCommentId: row.parent_comment_id,
    author: authorById[row.author_id]
      ? { id: row.author_id, name: `${authorById[row.author_id].first_name} ${authorById[row.author_id].last_name}`, headline: authorById[row.author_id].headline }
      : null,
    body: row.content,
    attachments: row.attachments || [],
    createdAt: row.created_at,
    editedAt: row.edited_at,
    replyCount: replyCountByParent[row.id] || 0,
    reactionCount: reactionCountByComment[row.id] || 0,
    viewerReaction: viewerReactionByComment[row.id] || null,
    status: row.status,
    pendingReview: row.status === 'under_review',
  }));
}

export async function createComment(userId, postId, { body, parentCommentId = null, attachments = [] }) {
  if (!body?.trim() && (!attachments || attachments.length === 0)) throw new AppError('Comment cannot be empty', 422);
  const post = await db('posts').where({ id: postId }).first();
  if (!post || post.deleted_at) throw new AppError('Post not found', 404);

  if (parentCommentId) {
    const parent = await db('post_comments').where({ id: parentCommentId, post_id: postId }).first();
    if (!parent) throw new AppError('Parent comment not found', 404);
  }

  const ATTACHMENT_TYPES = new Set(['gif', 'image', 'audio']);
  const cleanAttachments = (attachments || [])
    .filter((a) => a && ATTACHMENT_TYPES.has(a.type) && typeof a.url === 'string')
    .slice(0, 1) // one attachment per comment, matching the composer
    .map((a) => ({ type: a.type, url: a.url, width: a.width || null, height: a.height || null, durationSeconds: a.durationSeconds || null, provider: a.provider || null, providerId: a.providerId || null }));

  // Synchronous, short-timeout, fail-open moderation screen (same contract
  // as createPost/createArticle). A hold_for_review verdict no longer
  // rejects the comment outright — it's created with status 'under_review'
  // (hidden from other viewers' threads, still visible to its own author
  // with a pending-review indicator) and queued in content_moderation_actions
  // for an admin to approve or remove, matching posts/articles parity.
  const moderationResult = body?.trim() ? await screenContent({ text: body, authorId: userId, objectType: 'comment' }) : null;
  const status = moderationResult?.label === 'hold_for_review' ? 'under_review' : 'published';

  const comment = await db.transaction(async (trx) => {
    const [row] = await trx('post_comments')
      .insert({ post_id: postId, author_id: userId, content: body || '', parent_comment_id: parentCommentId, attachments: JSON.stringify(cleanAttachments), status })
      .returning('*');
    if (status === 'published') await trx('posts').where({ id: postId }).increment('comment_count', 1);
    if (status === 'under_review') {
      await trx('content_moderation_actions').insert({
        object_type: 'comment',
        object_id: row.id,
        action: 'held',
        reason: (moderationResult.reason_codes || []).join(', '),
        actor_type: 'system',
      });
    }
    return row;
  });

  if (moderationResult) {
    logMlInference({ objectType: 'comment', objectId: comment.id, modelName: 'moderation-screen', modelVersion: moderationResult.model_version, actorId: userId, output: moderationResult }).catch(() => {});
  }

  // Held comments are not live yet — no notification, no activity feed
  // entry, no ranker training signal until an admin approves them.
  if (status === 'under_review') {
    return comment;
  }

  const actor = await db('users').where({ id: userId }).first('first_name', 'last_name');
  const actorName = actor ? `${actor.first_name} ${actor.last_name}` : 'Someone';
  const deepLink = `/app/post-detail/${postId}`;

  if (parentCommentId) {
    const parent = await db('post_comments').where({ id: parentCommentId }).first('author_id');
    await notify({ userId: parent?.author_id, actorId: userId, type: 'comment.reply', payload: { actorName, postId, commentId: comment.id, deepLink } });
    await recordActivity({ actorUserId: userId, verb: 'mentioned', objectType: 'comment', objectId: comment.id, targetType: 'user', targetId: parent?.author_id, context: { postId, deepLink, actorName } });
  } else {
    await notify({ userId: post.author_id, actorId: userId, type: 'post.comment', payload: { actorName, postId, commentId: comment.id, deepLink } });
  }

  await recordActivity({ actorUserId: userId, verb: 'commented', objectType: 'comment', objectId: comment.id, targetType: 'post', targetId: postId, context: { deepLink } });
  queueFeedRankerTraining(userId, postId, 1).catch(() => {});
  bumpDailyMetric(postId, 'comments', 1).catch(() => {});

  const fresh = await db('posts').where({ id: postId }).first('comment_count');
  await publishFeedEvent('post:comment_count_updated', { postId, commentCount: fresh?.comment_count ?? 0 }, [`post:${postId}`]);

  return comment;
}

export async function updateComment(userId, commentId, body) {
  const comment = await db('post_comments').where({ id: commentId }).first();
  if (!comment || comment.deleted_at) throw new AppError('Comment not found', 404);
  if (comment.author_id !== userId) throw new AppError('You can only edit your own comments', 403);
  const [updated] = await db('post_comments').where({ id: commentId }).update({ content: body, edited_at: db.fn.now(), updated_at: db.fn.now() }).returning('*');
  return updated;
}

export async function deleteComment(userId, commentId) {
  const comment = await db('post_comments').where({ id: commentId }).first();
  if (!comment || comment.deleted_at) throw new AppError('Comment not found', 404);
  if (comment.author_id !== userId) throw new AppError('You can only delete your own comments', 403);
  // A held (under_review) comment was never counted in comment_count (see
  // createComment) — only decrement for a comment that actually was.
  const wasCounted = comment.status === 'published';
  await db.transaction(async (trx) => {
    await trx('post_comments').where({ id: commentId }).update({ deleted_at: trx.fn.now() });
    if (wasCounted) await trx('posts').where({ id: comment.post_id }).decrement('comment_count', 1);
  });
  if (wasCounted) {
    bumpDailyMetric(comment.post_id, 'comments', -1).catch(() => {});
    const fresh = await db('posts').where({ id: comment.post_id }).first('comment_count');
    await publishFeedEvent('post:comment_count_updated', { postId: comment.post_id, commentCount: fresh?.comment_count ?? 0 }, [`post:${comment.post_id}`]);
  }
}

export async function reactToComment(userId, commentId, reactionType) {
  if (!REACTION_TYPES.has(reactionType)) throw new AppError('Invalid reaction type', 422);
  const comment = await db('post_comments').where({ id: commentId }).first();
  if (!comment || comment.deleted_at) throw new AppError('Comment not found', 404);

  const isNewReaction = await db.transaction(async (trx) => {
    const existing = await trx('comment_reactions').where({ comment_id: commentId, actor_person_id: userId }).first();
    if (existing) {
      await trx('comment_reactions').where({ id: existing.id }).update({ reaction_type: reactionType, updated_at: trx.fn.now() });
      return false;
    }
    await trx('comment_reactions').insert({ comment_id: commentId, actor_person_id: userId, reaction_type: reactionType });
    return true;
  });

  if (isNewReaction && comment.author_id !== userId) {
    const actor = await db('users').where({ id: userId }).first('first_name', 'last_name');
    await notify({
      userId: comment.author_id,
      actorId: userId,
      type: 'comment.reaction',
      payload: { actorName: actor ? `${actor.first_name} ${actor.last_name}` : 'Someone', postId: comment.post_id, commentId, reactionType, deepLink: `/app/post-detail/${comment.post_id}` },
    });
  }

  const fresh = await db('comment_reactions').where({ comment_id: commentId }).count('id as c').first();
  return { reactionType, reactionCount: Number(fresh?.c || 0) };
}

export async function removeCommentReaction(userId, commentId) {
  await db('comment_reactions').where({ comment_id: commentId, actor_person_id: userId }).del();
  const fresh = await db('comment_reactions').where({ comment_id: commentId }).count('id as c').first();
  return { reactionCount: Number(fresh?.c || 0) };
}

/**
 * "Share this comment" — reposts a comment's content as a new top-level post
 * that links back to the original post/comment, distinct from sharePost()
 * (which reposts a whole post). No `original_post_id`-shaped table fits a
 * comment (that FK targets `posts`), hence the separate `comment_shares`
 * table (§migration 161) rather than overloading post_shares.
 */
export async function shareComment(userId, commentId, { comment: quoteText } = {}) {
  const original = await db('post_comments').where({ id: commentId }).first();
  if (!original || original.deleted_at) throw new AppError('Comment not found', 404);

  return db.transaction(async (trx) => {
    const contentParts = [quoteText?.trim(), `"${original.content}"`].filter(Boolean);
    const [newPost] = await trx('posts')
      .insert({
        author_id: userId,
        content: contentParts.join('\n\n'),
        visibility: 'public',
        post_type: 'text',
        media: '[]',
      })
      .returning('*');

    await trx('comment_shares').insert({ comment_id: commentId, actor_person_id: userId, new_post_id: newPost.id });
    return newPost;
  });
}

export async function sharePost(userId, postId, { shareType = 'repost', comment, destinationConversationId } = {}) {
  const original = await db('posts').where({ id: postId }).first();
  if (!original || original.deleted_at) throw new AppError('Post not found', 404);

  return db.transaction(async (trx) => {
    let newPostId = null;
    if (shareType === 'repost' || shareType === 'repost_with_comment') {
      const [repost] = await trx('posts')
        .insert({
          author_id: userId,
          content: comment || '',
          visibility: 'public',
          post_type: 'share',
          shared_from_post_id: postId,
          media: '[]',
        })
        .returning('*');
      newPostId = repost.id;
    }

    await trx('post_shares').insert({
      original_post_id: postId,
      actor_person_id: userId,
      share_type: shareType,
      new_post_id: newPostId,
      destination_conversation_id: destinationConversationId || null,
    });
    await trx('posts').where({ id: postId }).increment('share_count', 1);
    return { newPostId };
  }).then((result) => {
    queueFeedRankerTraining(userId, postId, 1).catch(() => {});
    bumpDailyMetric(postId, 'shares', 1).catch(() => {});
    return result;
  });
}

export async function savePost(userId, postId) {
  const post = await db('posts').where({ id: postId }).first();
  if (!post || post.deleted_at) throw new AppError('Post not found', 404);
  // saved_items' uniqueness is a COALESCE(organization_id, ...) partial index
  // (see migration 20260101000028), which knex's .onConflict() column-list
  // form can't target — check-then-insert instead.
  const existing = await db('saved_items').where({ user_id: userId, object_type: 'post', object_id: postId }).first();
  if (!existing) {
    await db('saved_items').insert({ user_id: userId, object_type: 'post', object_id: postId, source_surface: 'live_feed' });
    queueFeedRankerTraining(userId, postId, 1).catch(() => {});
    bumpDailyMetric(postId, 'saves', 1).catch(() => {});
  }
}

export async function unsavePost(userId, postId) {
  const count = await db('saved_items').where({ user_id: userId, object_type: 'post', object_id: postId }).del();
  if (count) {
    queueFeedRankerTraining(userId, postId, 0).catch(() => {});
    bumpDailyMetric(postId, 'saves', -1).catch(() => {});
  }
}

export async function votePoll(userId, pollId, optionIds) {
  const poll = await db('polls').where({ id: pollId }).first();
  if (!poll) throw new AppError('Poll not found', 404);
  if (poll.status === 'closed') throw new AppError('This poll is closed', 422);
  const selectedOptions = await db('poll_options').where({ poll_id: pollId }).whereIn('id', optionIds);
  if (!selectedOptions.length) throw new AppError('Invalid poll option', 422);
  if (!poll.multiple_choice && optionIds.length > 1) throw new AppError('This poll only allows one choice', 422);

  await db.transaction(async (trx) => {
    await trx('poll_votes').where({ poll_id: pollId, person_id: userId }).del();
    await trx('poll_votes').insert(optionIds.map((optionId) => ({ poll_id: pollId, option_id: optionId, person_id: userId })));
  });

  const voteRows = await db('poll_votes').where({ poll_id: pollId }).select('option_id');
  const totalVotes = voteRows.length;
  const countByOption = {};
  for (const v of voteRows) countByOption[v.option_id] = (countByOption[v.option_id] || 0) + 1;
  const options = await db('poll_options').where({ poll_id: pollId }).orderBy('order_index', 'asc');
  const results = options.map((o) => ({
    id: o.id,
    voteCount: countByOption[o.id] || 0,
    percentage: totalVotes ? Math.round(((countByOption[o.id] || 0) / totalVotes) * 1000) / 10 : 0,
  }));
  await publishFeedEvent('poll:updated', { pollId, postId: poll.post_id, totalVotes, options: results }, [`post:${poll.post_id}`]);
}

/**
 * Poll Detail page. Every number here is a real, freshly-computed query
 * against poll_votes/poll_options — no fabricated "impressions",
 * "engagement rate", "voter breakdown by role/company size" or AI summary,
 * none of which have backing data in this schema.
 *
 * "Trend over time" is intentionally omitted: votePoll() deletes a voter's
 * prior poll_votes row(s) before inserting their new choice (so a person can
 * change their vote), which means poll_votes.created_at only reflects each
 * voter's *current* choice, not a historical event log. Charting "votes per
 * option per day" from that would silently under-count past votes that were
 * since changed — a fabricated-looking trend built on real-looking data — so
 * it's left out rather than shipped misleading.
 */
export async function getPollDetail(viewerId, pollId) {
  const poll = await db('polls').where({ id: pollId }).first();
  if (!poll) throw new AppError('Poll not found', 404);

  const post = await visibleCandidates(db('posts').where('posts.id', poll.post_id), viewerId).first();
  if (!post) throw new AppError('Poll not found', 404);

  const [options, voteRows, author] = await Promise.all([
    db('poll_options').where({ poll_id: pollId }).orderBy('order_index', 'asc'),
    db('poll_votes').where({ poll_id: pollId }).select('option_id', 'person_id'),
    db('users').where({ id: post.author_id }).first('id', 'first_name', 'last_name', 'headline', 'account_type'),
  ]);

  const totalVotes = voteRows.length;
  const uniqueVoters = new Set(voteRows.map((v) => v.person_id)).size;
  const myVotes = voteRows.filter((v) => v.person_id === viewerId).map((v) => v.option_id);
  const countByOption = {};
  for (const v of voteRows) countByOption[v.option_id] = (countByOption[v.option_id] || 0) + 1;

  const results = options.map((o) => ({
    id: o.id,
    label: o.label,
    orderIndex: o.order_index,
    voteCount: countByOption[o.id] || 0,
    percentage: totalVotes ? Math.round(((countByOption[o.id] || 0) / totalVotes) * 1000) / 10 : 0,
  }));

  const [hydratedPost] = await hydratePosts([post], viewerId);

  return {
    id: poll.id,
    postId: poll.post_id,
    question: poll.question,
    multipleChoice: poll.multiple_choice,
    status: poll.status,
    endsAt: poll.ends_at,
    createdAt: poll.created_at,
    isOwner: post.author_id === viewerId,
    author: author
      ? { id: author.id, name: `${author.first_name} ${author.last_name}`, headline: author.headline, accountType: author.account_type }
      : null,
    options: results,
    totalVotes,
    uniqueVoters,
    myVotes,
    post: hydratedPost,
  };
}

export async function closePoll(userId, pollId) {
  const poll = await db('polls').where({ id: pollId }).first();
  if (!poll) throw new AppError('Poll not found', 404);
  const post = await db('posts').where({ id: poll.post_id }).first();
  if (!post || post.author_id !== userId) throw new AppError('Only the poll owner can close this poll', 403);
  if (poll.status === 'closed') return;
  await db('polls').where({ id: pollId }).update({ status: 'closed', updated_at: db.fn.now() });
}

/**
 * Recommended Feed's "Not interested" / "Hide author" / "Hide topic"
 * controls. These persist to feed_negative_feedback and are read back by
 * visibleCandidates() above on every subsequent feed request — a real
 * server-side filter, not client-side hiding.
 */
export async function recordNotInterested(userId, postId) {
  const post = await db('posts').where({ id: postId }).first('id');
  if (!post) throw new AppError('Post not found', 404);
  const existing = await db('feed_negative_feedback').where({ user_id: userId, post_id: postId, feedback_type: 'not_interested' }).first();
  if (!existing) await db('feed_negative_feedback').insert({ user_id: userId, post_id: postId, feedback_type: 'not_interested' });
}

export async function recordHideAuthor(userId, authorId) {
  if (authorId === userId) throw new AppError('You cannot hide yourself', 422);
  const author = await db('users').where({ id: authorId }).first('id');
  if (!author) throw new AppError('Author not found', 404);
  const existing = await db('feed_negative_feedback').where({ user_id: userId, author_id: authorId, feedback_type: 'hide_author' }).first();
  if (!existing) await db('feed_negative_feedback').insert({ user_id: userId, author_id: authorId, feedback_type: 'hide_author' });
}

export async function recordHideTopic(userId, topic) {
  const cleaned = String(topic || '').trim().replace(/^#/, '');
  if (!cleaned) throw new AppError('A topic is required', 422);
  const existing = await db('feed_negative_feedback').where({ user_id: userId, topic: cleaned, feedback_type: 'hide_topic' }).first();
  if (!existing) await db('feed_negative_feedback').insert({ user_id: userId, topic: cleaned, feedback_type: 'hide_topic' });
}

export async function listHiddenPreferences(userId) {
  const rows = await db('feed_negative_feedback').where({ user_id: userId }).select('feedback_type', 'author_id', 'topic', 'post_id', 'created_at');
  return {
    hiddenAuthorIds: rows.filter((r) => r.feedback_type === 'hide_author').map((r) => r.author_id),
    hiddenTopics: rows.filter((r) => r.feedback_type === 'hide_topic').map((r) => r.topic),
    notInterestedPostIds: rows.filter((r) => r.feedback_type === 'not_interested').map((r) => r.post_id),
  };
}
