import { db, ownerScope, paginationParams, logActivity, notifyUser } from './shared.js';
import { AppError } from '../../common/errors/AppError.js';
import { emitEvent } from '../../common/events/outbox.js';

const TABLE = 'crm_followups';

const WRITABLE_FIELDS = {
  objectType: 'object_type',
  objectId: 'object_id',
  type: 'type',
  dueAt: 'due_at',
  priority: 'priority',
  ownerUserId: 'owner_user_id',
  reason: 'reason',
  aiRecommended: 'ai_recommended',
};

function buildPatch(data = {}) {
  const patch = {};
  for (const [key, column] of Object.entries(WRITABLE_FIELDS)) {
    if (data[key] !== undefined) patch[column] = data[key];
  }
  return patch;
}

export async function list(owner, filters = {}) {
  const { limit, offset } = paginationParams(filters);
  const { status, ownerUserId, objectType, objectId, dueBefore, dueAfter } = filters;

  const build = () => {
    const qb = ownerScope(db(TABLE), owner);
    if (status) qb.andWhere({ status });
    if (ownerUserId) qb.andWhere({ owner_user_id: ownerUserId });
    if (objectType) qb.andWhere({ object_type: objectType });
    if (objectId) qb.andWhere({ object_id: objectId });
    if (dueBefore) qb.andWhere('due_at', '<=', dueBefore);
    if (dueAfter) qb.andWhere('due_at', '>=', dueAfter);
    return qb;
  };

  const [rows, [{ count }]] = await Promise.all([
    build().orderBy('due_at', 'asc').limit(limit).offset(offset),
    build().count({ count: '*' }),
  ]);

  return { data: rows, total: Number(count) };
}

export async function getById(owner, id) {
  const record = await ownerScope(db(TABLE), owner).where({ id }).first();
  if (!record) throw new AppError('Follow-up not found', 404);
  return record;
}

export async function create(owner, actorId, data) {
  return db.transaction(async (trx) => {
    const patch = buildPatch(data);
    if (!patch.object_type) throw new AppError('objectType is required', 400);
    if (!patch.object_id) throw new AppError('objectId is required', 400);
    if (!patch.due_at) throw new AppError('dueAt is required', 400);

    const [record] = await trx(TABLE)
      .insert({
        owner_type: owner.ownerType,
        owner_id: owner.ownerId,
        workspace_id: owner.workspaceId ?? null,
        ...patch,
      })
      .returning('*');

    await logActivity(trx, owner, {
      objectType: patch.object_type,
      objectId: patch.object_id,
      actorId,
      activityType: 'followup',
      summary: 'Follow-up scheduled',
      metadataJsonb: { followupId: record.id, dueAt: record.due_at },
    });
    await emitEvent({ aggregateType: patch.object_type, aggregateId: patch.object_id, eventType: 'crm.followup.created', payload: { followupId: record.id, dueAt: record.due_at } }, trx);
    await notifyUser(trx, record.owner_user_id, 'crm.followup.due', { followupId: record.id, objectType: record.object_type, objectId: record.object_id, dueAt: record.due_at });

    return record;
  });
}

export async function update(owner, actorId, id, data) {
  return db.transaction(async (trx) => {
    const existing = await ownerScope(trx(TABLE), owner).where({ id }).first();
    if (!existing) throw new AppError('Follow-up not found', 404);

    const patch = buildPatch(data);
    patch.updated_at = trx.fn.now();

    const [record] = await trx(TABLE).where({ id }).update(patch).returning('*');
    await emitEvent({ aggregateType: record.object_type, aggregateId: record.object_id, eventType: 'crm.followup.updated', payload: { followupId: id, fields: Object.keys(patch) } }, trx);

    return record;
  });
}

export async function remove(owner, actorId, id) {
  return db.transaction(async (trx) => {
    const existing = await ownerScope(trx(TABLE), owner).where({ id }).first();
    if (!existing) throw new AppError('Follow-up not found', 404);
    await trx(TABLE).where({ id }).del();
    await emitEvent({ aggregateType: existing.object_type, aggregateId: existing.object_id, eventType: 'crm.followup.deleted', payload: { followupId: id } }, trx);
  });
}

export async function complete(owner, actorId, id) {
  return db.transaction(async (trx) => {
    const existing = await ownerScope(trx(TABLE), owner).where({ id }).first();
    if (!existing) throw new AppError('Follow-up not found', 404);

    const [record] = await trx(TABLE).where({ id }).update({ status: 'done', completed_at: trx.fn.now(), updated_at: trx.fn.now() }).returning('*');

    await logActivity(trx, owner, {
      objectType: record.object_type,
      objectId: record.object_id,
      actorId,
      activityType: 'followup',
      summary: 'Follow-up completed',
      metadataJsonb: { followupId: id },
    });
    await emitEvent({ aggregateType: record.object_type, aggregateId: record.object_id, eventType: 'crm.followup.completed', payload: { followupId: id } }, trx);

    return record;
  });
}

export async function snooze(owner, actorId, id, { untilAt } = {}) {
  if (!untilAt) throw new AppError('untilAt is required', 400);

  return db.transaction(async (trx) => {
    const existing = await ownerScope(trx(TABLE), owner).where({ id }).first();
    if (!existing) throw new AppError('Follow-up not found', 404);

    const [record] = await trx(TABLE)
      .where({ id })
      .update({ status: 'snoozed', due_at: untilAt, updated_at: trx.fn.now() })
      .returning('*');

    await emitEvent({ aggregateType: record.object_type, aggregateId: record.object_id, eventType: 'crm.followup.snoozed', payload: { followupId: id, untilAt } }, trx);
    await notifyUser(trx, record.owner_user_id, 'crm.followup.due', { followupId: record.id, objectType: record.object_type, objectId: record.object_id, dueAt: record.due_at });

    return record;
  });
}

/**
 * markOverdue — sweeps open follow-ups whose due_at has passed and notifies
 * their owner. Not wired to a scheduler in this environment (no cron runner
 * exists in this repo yet); exported so a future job can call it, and
 * exercised directly by the GET /followups?status=open&due_before=now path
 * on the client side in the meantime.
 */
export async function markOverdue(owner) {
  return db.transaction(async (trx) => {
    const overdue = await ownerScope(trx(TABLE), owner)
      .where({ status: 'open' })
      .andWhere('due_at', '<', trx.fn.now());

    for (const followup of overdue) {
      await notifyUser(trx, followup.owner_user_id, 'crm.followup.overdue', {
        followupId: followup.id,
        objectType: followup.object_type,
        objectId: followup.object_id,
        dueAt: followup.due_at,
      });
    }

    return overdue;
  });
}
