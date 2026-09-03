import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';

/**
 * Saved items are polymorphic (object_type + object_id). Only `post` has a
 * real hydration path today (the other object types referenced by the
 * Domain 01 IA — gig, project, page, person, group, event — aren't first-class
 * domains yet); those rows still list with their stored metadata rather than
 * being silently dropped, so nothing here fabricates an object that doesn't
 * exist server-side.
 */
export async function list(userId, { objectType } = {}) {
  let query = db('saved_items').where({ user_id: userId }).orderBy('saved_at', 'desc');
  if (objectType && objectType !== 'all') query = query.andWhere({ object_type: objectType });
  const rows = await query;

  const postIds = rows.filter((r) => r.object_type === 'post').map((r) => r.object_id);
  const posts = postIds.length
    ? await db('posts as p')
        .whereIn('p.id', postIds)
        .leftJoin('users as u', 'u.id', 'p.author_id')
        .select('p.id', 'p.content', 'p.deleted_at', 'u.first_name', 'u.last_name')
    : [];
  const postById = Object.fromEntries(posts.map((p) => [p.id, p]));

  return rows.map((row) => {
    if (row.object_type === 'post') {
      const post = postById[row.object_id];
      return {
        id: row.id,
        objectType: row.object_type,
        objectId: row.object_id,
        savedAt: row.saved_at,
        isPinned: row.is_pinned,
        collectionId: row.collection_id,
        title: post?.deleted_at ? 'This post is no longer available' : post ? `${post.first_name} ${post.last_name}: ${post.content.slice(0, 80)}` : 'Post unavailable',
        isTombstoned: !post || Boolean(post.deleted_at),
        route: `/app/live-feed?post=${row.object_id}`,
      };
    }
    return {
      id: row.id,
      objectType: row.object_type,
      objectId: row.object_id,
      savedAt: row.saved_at,
      isPinned: row.is_pinned,
      collectionId: row.collection_id,
      title: row.metadata?.title || `${row.object_type} item`,
      isTombstoned: false,
      route: null,
    };
  });
}

export async function remove(userId, id) {
  const count = await db('saved_items').where({ id, user_id: userId }).del();
  if (!count) throw new AppError('Saved item not found', 404);
}

export async function togglePin(userId, id, isPinned) {
  const count = await db('saved_items').where({ id, user_id: userId }).update({ is_pinned: isPinned });
  if (!count) throw new AppError('Saved item not found', 404);
}
