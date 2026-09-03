import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';

const TABLE = 'talent_pools';
const MEMBERS_TABLE = 'talent_pool_members';

const POOL_WRITABLE_FIELDS = ['name', 'description', 'pool_type', 'owner_id', 'status', 'tags'];
const MEMBER_WRITABLE_FIELDS = ['user_id', 'candidate_name', 'candidate_email', 'source', 'match_score', 'notes'];

function pickWritableFields(body = {}, fields) {
  const out = {};
  for (const field of fields) {
    if (body[field] !== undefined) out[field] = body[field];
  }
  return out;
}

async function getPoolOrThrow(id, companyId) {
  const pool = await db(TABLE).where({ id }).first();
  if (!pool) throw new AppError('talent pool not found', 404);
  if (companyId && pool.company_id !== companyId) throw new AppError('You do not have access to this talent pool', 403);
  return pool;
}

async function syncMemberCount(poolId) {
  const row = await db(MEMBERS_TABLE).where({ talent_pool_id: poolId }).count({ count: '*' }).first();
  await db(TABLE).where({ id: poolId }).update({ member_count: Number(row?.count || 0) });
}

export async function list(companyId, filters = {}) {
  if (!companyId) throw new AppError('Select a business workspace to continue', 400, { code: 'WORKSPACE_REQUIRED' });
  const { status, pool_type } = filters;

  const build = () => {
    const qb = db(TABLE).where({ company_id: companyId });
    if (status) qb.andWhere({ status });
    if (pool_type) qb.andWhere({ pool_type });
    return qb;
  };

  const [rows, [{ count }]] = await Promise.all([
    build().orderBy('created_at', 'desc'),
    build().count({ count: '*' }),
  ]);

  return { items: rows, total: Number(count) };
}

export async function getById(id, companyId) {
  const pool = await getPoolOrThrow(id, companyId);
  const members = await db(MEMBERS_TABLE).where({ talent_pool_id: id }).orderBy('added_at', 'desc');
  return { ...pool, members };
}

export async function create(companyId, data) {
  if (!companyId) throw new AppError('Select a business workspace to continue', 400, { code: 'WORKSPACE_REQUIRED' });
  const fields = pickWritableFields(data, POOL_WRITABLE_FIELDS);
  if (!fields.name) throw new AppError('name is required', 400);
  if (fields.tags !== undefined) fields.tags = JSON.stringify(fields.tags);

  const [record] = await db(TABLE)
    .insert({ ...fields, company_id: companyId })
    .returning('*');
  return record;
}

export async function update(id, companyId, data) {
  await getPoolOrThrow(id, companyId);
  const fields = pickWritableFields(data, POOL_WRITABLE_FIELDS);
  if (fields.tags !== undefined) fields.tags = JSON.stringify(fields.tags);

  const [record] = await db(TABLE).where({ id }).update(fields).returning('*');
  return record;
}

export async function remove(id, companyId) {
  await getPoolOrThrow(id, companyId);
  const [record] = await db(TABLE).where({ id }).update({ status: 'archived' }).returning('*');
  return record;
}

export async function addMember(poolId, companyId, data) {
  await getPoolOrThrow(poolId, companyId);
  const fields = pickWritableFields(data, MEMBER_WRITABLE_FIELDS);
  if (!fields.candidate_name) throw new AppError('candidate_name is required', 400);

  const [record] = await db(MEMBERS_TABLE)
    .insert({ ...fields, talent_pool_id: poolId })
    .returning('*');
  await syncMemberCount(poolId);
  return record;
}

export async function removeMember(poolId, memberId, companyId) {
  await getPoolOrThrow(poolId, companyId);
  const existing = await db(MEMBERS_TABLE).where({ id: memberId, talent_pool_id: poolId }).first('id');
  if (!existing) throw new AppError('talent pool member not found', 404);
  await db(MEMBERS_TABLE).where({ id: memberId }).del();
  await syncMemberCount(poolId);
}
