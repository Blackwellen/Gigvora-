import { db, ownerScope, paginationParams } from './shared.js';
import { AppError } from '../../common/errors/AppError.js';
import { emitEvent } from '../../common/events/outbox.js';

const TABLE = 'crm_activities';
const OBJECT_TYPES = ['contact', 'lead', 'account', 'opportunity'];

export async function list(owner, filters = {}) {
  const { limit, offset } = paginationParams(filters);
  const { objectType, objectId } = filters;

  const build = () => {
    const qb = ownerScope(db(TABLE), owner);
    if (objectType) qb.andWhere({ object_type: objectType });
    if (objectId) qb.andWhere({ object_id: objectId });
    return qb;
  };

  const [rows, [{ count }]] = await Promise.all([
    build().orderBy('occurred_at', 'desc').limit(limit).offset(offset),
    build().count({ count: '*' }),
  ]);

  return { data: rows, total: Number(count) };
}

export async function getById(owner, id) {
  const record = await ownerScope(db(TABLE), owner).where({ id }).first();
  if (!record) throw new AppError('Activity not found', 404);
  return record;
}

export async function create(owner, actorId, data = {}) {
  const { objectType, objectId, activityType, direction = 'internal', subject, summary, occurredAt, metadataJsonb = {} } = data;

  if (!OBJECT_TYPES.includes(objectType)) throw new AppError('objectType must be one of contact, lead, account, opportunity', 400);
  if (!objectId) throw new AppError('objectId is required', 400);
  if (!activityType) throw new AppError('activityType is required', 400);

  return db.transaction(async (trx) => {
    const [record] = await trx(TABLE)
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
        occurred_at: occurredAt ?? trx.fn.now(),
        metadata_jsonb: JSON.stringify(metadataJsonb ?? {}),
      })
      .returning('*');

    await emitEvent({ aggregateType: objectType, aggregateId: objectId, eventType: 'crm.activity.created', payload: { activityId: record.id, activityType } }, trx);

    return record;
  });
}
