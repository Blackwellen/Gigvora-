import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { publishFeedEvent, roomsForPostAudience } from '../../common/events/feedEvents.js';
import { recordActivity } from '../activity/activity.service.js';

/**
 * Minimal moderation governance surface — list what's currently held (status
 * 'under_review', set by posts.service.js / articles.service.js / comment
 * creation in posts.service.js#createComment when the ML moderation-screen
 * returns hold_for_review), and let a platform-staff admin approve (publish
 * it) or remove (soft-delete/hide it) it. Every action is recorded in
 * content_moderation_actions as a durable audit trail. Comments were added
 * to this queue in Domain 05 Phase 5 — previously a held comment was
 * rejected outright instead of being queued for review.
 */
export async function listHeldContent({ objectType, limit = 50, offset = 0 } = {}) {
  const wantsPosts = !objectType || objectType === 'post' || objectType === 'article';
  const wantsComments = !objectType || objectType === 'comment';

  const [postRows, commentRows] = await Promise.all([
    wantsPosts
      ? (() => {
          let query = db('posts').whereNull('deleted_at').andWhere('status', 'under_review').orderBy('created_at', 'desc');
          if (objectType === 'post') query = query.andWhere('post_type', '!=', 'article');
          if (objectType === 'article') query = query.andWhere('post_type', 'article');
          return query;
        })()
      : [],
    // Comments held for review (Domain 05 Phase 5 gap #2) — same queue,
    // same approve/remove actions as posts/articles, just a different table.
    wantsComments
      ? db('post_comments').whereNull('deleted_at').andWhere('status', 'under_review').orderBy('created_at', 'desc')
      : [],
  ]);

  const rows = [
    ...postRows.map((r) => ({ ...r, __objectType: r.post_type === 'article' ? 'article' : 'post' })),
    ...commentRows.map((r) => ({ ...r, __objectType: 'comment' })),
  ];
  if (!rows.length) return [];

  const [authors, actions] = await Promise.all([
    db('users')
      .whereIn('id', rows.map((r) => r.author_id))
      .select('id', 'first_name', 'last_name'),
    db('content_moderation_actions')
      .whereIn('object_type', ['post', 'article', 'comment'])
      .whereIn('object_id', rows.map((r) => r.id))
      .andWhere('action', 'held')
      .orderBy('created_at', 'desc'),
  ]);

  const authorById = Object.fromEntries(authors.map((a) => [a.id, a]));
  const latestActionByObject = {};
  for (const action of actions) {
    if (!latestActionByObject[action.object_id]) latestActionByObject[action.object_id] = action;
  }

  return rows
    .map((row) => ({
      id: row.id,
      objectType: row.__objectType,
      authorId: row.author_id,
      author: authorById[row.author_id] ? { id: row.author_id, name: `${authorById[row.author_id].first_name} ${authorById[row.author_id].last_name}` } : null,
      content: row.content,
      visibility: row.visibility || null,
      postId: row.__objectType === 'comment' ? row.post_id : null,
      createdAt: row.created_at,
      heldReason: latestActionByObject[row.id]?.reason || null,
      heldAt: latestActionByObject[row.id]?.created_at || null,
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(offset, offset + limit);
}

async function loadHeldPost(objectId) {
  const post = await db('posts').where({ id: objectId }).whereNull('deleted_at').first();
  if (!post) throw new AppError('Content not found', 404);
  if (post.status !== 'under_review') throw new AppError('This content is not pending review', 422);
  return post;
}

async function loadHeldComment(objectId) {
  const comment = await db('post_comments').where({ id: objectId }).whereNull('deleted_at').first();
  if (!comment) throw new AppError('Content not found', 404);
  if (comment.status !== 'under_review') throw new AppError('This content is not pending review', 422);
  return comment;
}

export async function approveContent(adminId, objectId, reason = null) {
  // A held object is either a post/article row or a post_comments row — try
  // posts first (the common case), fall back to comments.
  const heldPost = await db('posts').where({ id: objectId }).whereNull('deleted_at').andWhere('status', 'under_review').first();
  if (heldPost) return approvePost(adminId, objectId, reason, heldPost);
  return approveComment(adminId, objectId, reason);
}

async function approvePost(adminId, objectId, reason, post) {
  await db.transaction(async (trx) => {
    await trx('posts').where({ id: objectId }).update({ status: 'published', updated_at: trx.fn.now() });
    await trx('content_moderation_actions').insert({
      object_type: post.post_type === 'article' ? 'article' : 'post',
      object_id: objectId,
      action: 'approved',
      reason,
      actor_type: 'admin',
      actor_id: adminId,
    });
  });

  await recordActivity({ actorUserId: post.author_id, verb: 'created', objectType: 'post', objectId, visibility: 'public', context: { preview: (post.content || '').slice(0, 120) } });
  const rooms = await roomsForPostAudience(post.author_id, post.visibility);
  await publishFeedEvent('feed:new_candidates', { postId: objectId, authorId: post.author_id }, rooms);
}

async function approveComment(adminId, objectId, reason) {
  const comment = await loadHeldComment(objectId);

  await db.transaction(async (trx) => {
    await trx('post_comments').where({ id: objectId }).update({ status: 'published', updated_at: trx.fn.now() });
    await trx('posts').where({ id: comment.post_id }).increment('comment_count', 1);
    await trx('content_moderation_actions').insert({
      object_type: 'comment',
      object_id: objectId,
      action: 'approved',
      reason,
      actor_type: 'admin',
      actor_id: adminId,
    });
  });

  const fresh = await db('posts').where({ id: comment.post_id }).first('comment_count');
  await publishFeedEvent('post:comment_count_updated', { postId: comment.post_id, commentCount: fresh?.comment_count ?? 0 }, [`post:${comment.post_id}`]);
}

export async function removeContent(adminId, objectId, reason = null) {
  const post = await db('posts').where({ id: objectId }).whereNull('deleted_at').first();
  if (post) return removePost(adminId, objectId, reason, post);
  return removeComment(adminId, objectId, reason);
}

async function removePost(adminId, objectId, reason, post) {
  await db.transaction(async (trx) => {
    await trx('posts').where({ id: objectId }).update({ deleted_at: trx.fn.now() });
    await trx('content_moderation_actions').insert({
      object_type: post.post_type === 'article' ? 'article' : 'post',
      object_id: objectId,
      action: 'removed',
      reason,
      actor_type: 'admin',
      actor_id: adminId,
    });
  });

  await publishFeedEvent('post:deleted', { postId: objectId }, [`post:${objectId}`]);
}

async function removeComment(adminId, objectId, reason) {
  const comment = await db('post_comments').where({ id: objectId }).whereNull('deleted_at').first();
  if (!comment) throw new AppError('Content not found', 404);
  // Only decrement comment_count if this comment was actually counted in it
  // — a held (under_review) comment never was (see posts.service.js
  // createComment), same accounting rule as posts.service.js#deleteComment.
  const wasCounted = comment.status === 'published';

  await db.transaction(async (trx) => {
    await trx('post_comments').where({ id: objectId }).update({ status: 'removed', deleted_at: trx.fn.now() });
    if (wasCounted) await trx('posts').where({ id: comment.post_id }).decrement('comment_count', 1);
    await trx('content_moderation_actions').insert({
      object_type: 'comment',
      object_id: objectId,
      action: 'removed',
      reason,
      actor_type: 'admin',
      actor_id: adminId,
    });
  });

  if (wasCounted) {
    const fresh = await db('posts').where({ id: comment.post_id }).first('comment_count');
    await publishFeedEvent('post:comment_count_updated', { postId: comment.post_id, commentCount: fresh?.comment_count ?? 0 }, [`post:${comment.post_id}`]);
  }
}

/** Full audit trail for one object — used by the admin queue detail expand. */
export async function listActionsForObject(objectId) {
  return db('content_moderation_actions').where({ object_id: objectId }).orderBy('created_at', 'desc');
}
