import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';

export async function list(recruiterId, { status } = {}) {
  const qb = db('recruiter_talent_pools').where({ recruiter_id: recruiterId });
  if (status) qb.andWhere({ status });
  return qb.orderBy('updated_at', 'desc');
}

export async function getById(recruiterId, id) {
  const pool = await db('recruiter_talent_pools').where({ id, recruiter_id: recruiterId }).first();
  if (!pool) throw new AppError('Talent pool not found', 404);
  const members = await db('recruiter_talent_pool_members').where({ pool_id: id }).orderBy('added_at', 'desc');
  return { ...pool, members };
}

export async function create(recruiterId, { name, description, tags } = {}) {
  if (!name?.trim()) throw new AppError('name is required', 422);
  const [row] = await db('recruiter_talent_pools')
    .insert({ recruiter_id: recruiterId, name: name.trim(), description: description || null, tags: JSON.stringify(tags || []) })
    .returning('*');
  return row;
}

export async function update(recruiterId, id, { name, description, status, tags } = {}) {
  const patch = {};
  if (name !== undefined) patch.name = name;
  if (description !== undefined) patch.description = description;
  if (tags !== undefined) patch.tags = JSON.stringify(tags);
  if (status !== undefined) {
    if (!['active', 'archived'].includes(status)) throw new AppError('Invalid status', 422);
    patch.status = status;
  }
  if (!Object.keys(patch).length) throw new AppError('Nothing to update', 422);

  const [row] = await db('recruiter_talent_pools').where({ id, recruiter_id: recruiterId }).update(patch).returning('*');
  if (!row) throw new AppError('Talent pool not found', 404);
  return row;
}

export async function remove(recruiterId, id) {
  const count = await db('recruiter_talent_pools').where({ id, recruiter_id: recruiterId }).del();
  if (!count) throw new AppError('Talent pool not found', 404);
}

async function assertOwnedPool(recruiterId, poolId) {
  const pool = await db('recruiter_talent_pools').where({ id: poolId, recruiter_id: recruiterId }).first();
  if (!pool) throw new AppError('Talent pool not found', 404);
  return pool;
}

export async function addMember(recruiterId, poolId, { candidate_id, candidate_name, candidate_email, match_score, notes } = {}) {
  await assertOwnedPool(recruiterId, poolId);
  let name = candidate_name;
  let email = candidate_email;
  if (candidate_id) {
    const user = await db('users').where({ id: candidate_id }).first('first_name', 'last_name', 'email');
    if (!user) throw new AppError('Candidate not found', 404);
    name = name || `${user.first_name} ${user.last_name}`.trim();
    email = email || user.email;
  }
  if (!name) throw new AppError('candidate_name is required when candidate_id is not provided', 422);

  const [row] = await db('recruiter_talent_pool_members')
    .insert({ pool_id: poolId, candidate_id: candidate_id || null, candidate_name: name, candidate_email: email || null, match_score: match_score ?? null, added_by: recruiterId, notes: notes || null })
    .returning('*');
  await db('recruiter_talent_pools').where({ id: poolId }).update({ member_count: db.raw('member_count + 1'), updated_at: db.fn.now() });
  return row;
}

export async function removeMember(recruiterId, poolId, memberId) {
  await assertOwnedPool(recruiterId, poolId);
  const count = await db('recruiter_talent_pool_members').where({ id: memberId, pool_id: poolId }).del();
  if (!count) throw new AppError('Member not found', 404);
  await db('recruiter_talent_pools').where({ id: poolId }).update({ member_count: db.raw('GREATEST(member_count - 1, 0)'), updated_at: db.fn.now() });
}
