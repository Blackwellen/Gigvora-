import { db } from '../../db/connection.js';

export async function recordActivity({ actorUserId, verb, objectType, objectId, targetType, targetId, visibility = 'private', context = {} }) {
  await db('activity_events').insert({
    actor_user_id: actorUserId || null,
    verb,
    object_type: objectType,
    object_id: objectId || null,
    target_type: targetType || null,
    target_id: targetId || null,
    visibility,
    context: JSON.stringify(context),
  });
}

/**
 * Recent Activity is the viewer's own chronology (their actions + activity
 * that names them as a target, e.g. mentions/replies) — distinct from the
 * Live Feed's social discovery stream. Scoped to the viewer server-side,
 * never a raw cross-user activity_events dump.
 */
export async function listActivity(viewerId, { tab = 'all', limit = 30, offset = 0 } = {}) {
  let query = db('activity_events').where((qb) => qb.where({ actor_user_id: viewerId }).orWhere({ target_type: 'user', target_id: viewerId }));

  if (tab === 'mentions') query = query.andWhere({ verb: 'mentioned' });
  if (tab === 'mine') query = query.andWhere({ actor_user_id: viewerId });

  const rows = await query.orderBy('created_at', 'desc').limit(limit).offset(offset);
  return rows.map((row) => ({
    id: row.id,
    verb: row.verb,
    objectType: row.object_type,
    objectId: row.object_id,
    context: row.context,
    createdAt: row.created_at,
  }));
}
