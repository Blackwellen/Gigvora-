import { db } from '../../db/connection.js';

/**
 * Resolves the CRM tenant scope for the request — mirrors
 * modules/contacts/contacts.service.js#resolveOwner. Every crm_* table is
 * scoped by (owner_type, owner_id), with workspace_id carried alongside for
 * company-owned records.
 */
export function resolveOwner(req) {
  const workspace = req.workspaceContext;
  if (workspace?.type === 'organization') {
    return { ownerType: 'company', ownerId: workspace.companyId, workspaceId: workspace.companyId };
  }
  return { ownerType: 'user', ownerId: req.user.sub, workspaceId: null };
}

export function ownerScope(qb, owner) {
  return qb.where({ owner_type: owner.ownerType, owner_id: owner.ownerId });
}

export function paginationParams(query = {}) {
  const limit = Math.min(Number(query.limit) > 0 ? Number(query.limit) : 20, 200);
  const offset = Number(query.offset) >= 0 ? Number(query.offset) : 0;
  return { limit, offset };
}

/**
 * Inserts a crm_activities row — the module's audit trail (no separate audit
 * table exists in this repo, per the CRM domain spec).
 */
export async function logActivity(trx, owner, { objectType, objectId, actorId, activityType, direction = 'internal', subject, summary, metadataJsonb = {} }) {
  const [row] = await trx('crm_activities')
    .insert({
      owner_type: owner.ownerType,
      owner_id: owner.ownerId,
      workspace_id: owner.workspaceId ?? null,
      object_type: objectType,
      object_id: objectId,
      actor_id: actorId ?? null,
      activity_type: activityType,
      direction,
      subject: subject ?? null,
      summary: summary ?? null,
      metadata_jsonb: JSON.stringify(metadataJsonb ?? {}),
    })
    .returning('*');
  return row;
}

export function jsonField(value, fallback) {
  return JSON.stringify(value === undefined ? fallback : value);
}

/**
 * Inserts a CRM notification row — reuses the shape of
 * modules/notifications/notifications.service.js#create. Best-effort: never
 * throws, since a missing/invalid userId shouldn't fail the parent mutation.
 */
export async function notifyUser(trx, userId, type, payload = {}) {
  if (!userId) return null;
  const executor = trx || db;
  try {
    const [row] = await executor('notifications')
      .insert({ user_id: userId, type, payload: JSON.stringify(payload ?? {}) })
      .returning('*');
    return row;
  } catch {
    return null;
  }
}

export { db };
