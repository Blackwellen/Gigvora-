import { db, ownerScope, paginationParams } from './shared.js';
import { AppError } from '../../common/errors/AppError.js';

const TABLE = 'crm_saved_views';

const WRITABLE_FIELDS = {
  name: 'name',
  objectType: 'object_type',
  visibility: 'visibility',
  filterJson: 'filter_json',
  sortJson: 'sort_json',
  columnJson: 'column_json',
  viewMode: 'view_mode',
  isDefault: 'is_default',
};

const JSON_FIELDS = new Set(['filter_json', 'sort_json', 'column_json']);

function buildPatch(data = {}) {
  const patch = {};
  for (const [key, column] of Object.entries(WRITABLE_FIELDS)) {
    if (data[key] !== undefined) {
      patch[column] = JSON_FIELDS.has(column) ? JSON.stringify(data[key]) : data[key];
    }
  }
  return patch;
}

export async function list(owner, userId, filters = {}) {
  const { limit, offset } = paginationParams(filters);
  const { objectType } = filters;

  const build = () => {
    const qb = ownerScope(db(TABLE), owner).andWhere((inner) => {
      inner.where({ owner_user_id: userId }).orWhereNot({ visibility: 'private' });
    });
    if (objectType) qb.andWhere({ object_type: objectType });
    return qb;
  };

  const [rows, [{ count }]] = await Promise.all([
    build().orderBy('is_default', 'desc').orderBy('updated_at', 'desc').limit(limit).offset(offset),
    build().count({ count: '*' }),
  ]);

  return { data: rows, total: Number(count) };
}

export async function getById(owner, id) {
  const record = await ownerScope(db(TABLE), owner).where({ id }).first();
  if (!record) throw new AppError('Saved view not found', 404);
  return record;
}

export async function create(owner, actorId, data) {
  return db.transaction(async (trx) => {
    const patch = buildPatch(data);
    if (!patch.name) throw new AppError('name is required', 400);
    if (!patch.object_type) throw new AppError('objectType is required', 400);

    if (patch.is_default) {
      await ownerScope(trx(TABLE), owner).where({ object_type: patch.object_type, owner_user_id: actorId }).update({ is_default: false });
    }

    const [record] = await trx(TABLE)
      .insert({
        owner_type: owner.ownerType,
        owner_id: owner.ownerId,
        workspace_id: owner.workspaceId ?? null,
        owner_user_id: actorId,
        ...patch,
      })
      .returning('*');

    return record;
  });
}

export async function update(owner, actorId, id, data) {
  return db.transaction(async (trx) => {
    const existing = await ownerScope(trx(TABLE), owner).where({ id }).first();
    if (!existing) throw new AppError('Saved view not found', 404);

    const patch = buildPatch(data);
    patch.updated_at = trx.fn.now();

    if (patch.is_default) {
      await ownerScope(trx(TABLE), owner).where({ object_type: existing.object_type, owner_user_id: actorId }).whereNot({ id }).update({ is_default: false });
    }

    const [record] = await trx(TABLE).where({ id }).update(patch).returning('*');
    return record;
  });
}

export async function remove(owner, actorId, id) {
  const count = await ownerScope(db(TABLE), owner).where({ id }).del();
  if (!count) throw new AppError('Saved view not found', 404);
}

export async function setDefault(owner, actorId, id) {
  return db.transaction(async (trx) => {
    const existing = await ownerScope(trx(TABLE), owner).where({ id }).first();
    if (!existing) throw new AppError('Saved view not found', 404);

    await ownerScope(trx(TABLE), owner).where({ object_type: existing.object_type, owner_user_id: actorId }).whereNot({ id }).update({ is_default: false });

    const [record] = await trx(TABLE).where({ id }).update({ is_default: true, updated_at: trx.fn.now() }).returning('*');
    return record;
  });
}

export async function duplicate(owner, actorId, id) {
  const existing = await getById(owner, id);
  const [record] = await db(TABLE)
    .insert({
      owner_type: owner.ownerType,
      owner_id: owner.ownerId,
      workspace_id: owner.workspaceId ?? null,
      owner_user_id: actorId,
      object_type: existing.object_type,
      visibility: 'private',
      name: `${existing.name} (copy)`,
      filter_json: JSON.stringify(existing.filter_json),
      sort_json: JSON.stringify(existing.sort_json),
      column_json: JSON.stringify(existing.column_json),
      view_mode: existing.view_mode,
      is_default: false,
    })
    .returning('*');
  return record;
}
