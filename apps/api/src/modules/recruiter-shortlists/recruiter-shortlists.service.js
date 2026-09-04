import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';

export async function list(recruiterId, { status } = {}) {
  const qb = db('recruiter_shortlists').where({ recruiter_id: recruiterId });
  if (status) qb.andWhere({ status });
  return qb.orderBy('updated_at', 'desc');
}

export async function getById(recruiterId, id) {
  const shortlist = await db('recruiter_shortlists').where({ id, recruiter_id: recruiterId }).first();
  if (!shortlist) throw new AppError('Shortlist not found', 404);
  const members = await db('recruiter_shortlist_members').where({ shortlist_id: id }).orderBy([{ column: 'rank', order: 'asc' }, { column: 'added_at', order: 'desc' }]);
  return { ...shortlist, members };
}

export async function create(recruiterId, { name, description, project_id } = {}) {
  if (!name?.trim()) throw new AppError('name is required', 422);
  if (project_id) {
    const project = await db('recruiter_projects').where({ id: project_id, recruiter_id: recruiterId }).first('id');
    if (!project) throw new AppError('Project not found', 404);
  }
  const [row] = await db('recruiter_shortlists')
    .insert({ recruiter_id: recruiterId, name: name.trim(), description: description || null, project_id: project_id || null })
    .returning('*');
  return row;
}

export async function update(recruiterId, id, { name, description, status, project_id } = {}) {
  const patch = {};
  if (name !== undefined) patch.name = name;
  if (description !== undefined) patch.description = description;
  if (project_id !== undefined) patch.project_id = project_id;
  if (status !== undefined) {
    if (!['active', 'archived'].includes(status)) throw new AppError('Invalid status', 422);
    patch.status = status;
  }
  if (!Object.keys(patch).length) throw new AppError('Nothing to update', 422);

  const [row] = await db('recruiter_shortlists').where({ id, recruiter_id: recruiterId }).update(patch).returning('*');
  if (!row) throw new AppError('Shortlist not found', 404);
  return row;
}

export async function remove(recruiterId, id) {
  const count = await db('recruiter_shortlists').where({ id, recruiter_id: recruiterId }).del();
  if (!count) throw new AppError('Shortlist not found', 404);
}

async function assertOwnedShortlist(recruiterId, shortlistId) {
  const shortlist = await db('recruiter_shortlists').where({ id: shortlistId, recruiter_id: recruiterId }).first();
  if (!shortlist) throw new AppError('Shortlist not found', 404);
  return shortlist;
}

export async function addMember(recruiterId, shortlistId, { candidate_id, candidate_name, rank, notes } = {}) {
  await assertOwnedShortlist(recruiterId, shortlistId);
  let name = candidate_name;
  if (candidate_id) {
    const user = await db('users').where({ id: candidate_id }).first('first_name', 'last_name');
    if (!user) throw new AppError('Candidate not found', 404);
    name = name || `${user.first_name} ${user.last_name}`.trim();
  }
  if (!name) throw new AppError('candidate_name is required when candidate_id is not provided', 422);

  const [row] = await db('recruiter_shortlist_members')
    .insert({ shortlist_id: shortlistId, candidate_id: candidate_id || null, candidate_name: name, rank: rank ?? null, notes: notes || null, added_by: recruiterId })
    .returning('*');
  return row;
}

export async function updateMember(recruiterId, shortlistId, memberId, { rank, notes } = {}) {
  await assertOwnedShortlist(recruiterId, shortlistId);
  const patch = {};
  if (rank !== undefined) patch.rank = rank;
  if (notes !== undefined) patch.notes = notes;
  if (!Object.keys(patch).length) throw new AppError('Nothing to update', 422);
  const [row] = await db('recruiter_shortlist_members').where({ id: memberId, shortlist_id: shortlistId }).update(patch).returning('*');
  if (!row) throw new AppError('Member not found', 404);
  return row;
}

export async function removeMember(recruiterId, shortlistId, memberId) {
  await assertOwnedShortlist(recruiterId, shortlistId);
  const count = await db('recruiter_shortlist_members').where({ id: memberId, shortlist_id: shortlistId }).del();
  if (!count) throw new AppError('Member not found', 404);
}
