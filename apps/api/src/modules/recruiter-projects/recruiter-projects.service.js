import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';

export async function list(recruiterId, { status } = {}) {
  const qb = db('recruiter_projects').where({ recruiter_id: recruiterId });
  if (status) qb.andWhere({ status });
  return qb.orderBy('updated_at', 'desc');
}

export async function getById(recruiterId, id) {
  const project = await db('recruiter_projects').where({ id, recruiter_id: recruiterId }).first();
  if (!project) throw new AppError('Project not found', 404);
  const members = await db('recruiter_project_members').where({ project_id: id }).orderBy('added_at', 'desc');
  const membersByStage = members.reduce((acc, m) => {
    (acc[m.stage] ||= []).push(m);
    return acc;
  }, {});
  return { ...project, members, members_by_stage: membersByStage };
}

export async function create(recruiterId, { name, description, client_or_role, target_hires, target_date } = {}) {
  if (!name?.trim()) throw new AppError('name is required', 422);
  const [row] = await db('recruiter_projects')
    .insert({
      recruiter_id: recruiterId,
      name: name.trim(),
      description: description || null,
      client_or_role: client_or_role || null,
      target_hires: target_hires || 1,
      target_date: target_date || null,
    })
    .returning('*');
  return row;
}

export async function update(recruiterId, id, { name, description, client_or_role, status, target_hires, target_date } = {}) {
  const patch = {};
  if (name !== undefined) patch.name = name;
  if (description !== undefined) patch.description = description;
  if (client_or_role !== undefined) patch.client_or_role = client_or_role;
  if (target_hires !== undefined) patch.target_hires = target_hires;
  if (target_date !== undefined) patch.target_date = target_date;
  if (status !== undefined) {
    if (!['active', 'on_hold', 'completed', 'archived'].includes(status)) throw new AppError('Invalid status', 422);
    patch.status = status;
  }
  if (!Object.keys(patch).length) throw new AppError('Nothing to update', 422);

  const [row] = await db('recruiter_projects').where({ id, recruiter_id: recruiterId }).update(patch).returning('*');
  if (!row) throw new AppError('Project not found', 404);
  return row;
}

export async function remove(recruiterId, id) {
  const count = await db('recruiter_projects').where({ id, recruiter_id: recruiterId }).del();
  if (!count) throw new AppError('Project not found', 404);
}

async function assertOwnedProject(recruiterId, projectId) {
  const project = await db('recruiter_projects').where({ id: projectId, recruiter_id: recruiterId }).first();
  if (!project) throw new AppError('Project not found', 404);
  return project;
}

const STAGES = ['sourced', 'contacted', 'screening', 'shortlisted', 'submitted', 'rejected', 'hired'];

export async function addMember(recruiterId, projectId, { candidate_id, candidate_name, stage, notes } = {}) {
  await assertOwnedProject(recruiterId, projectId);
  let name = candidate_name;
  if (candidate_id) {
    const user = await db('users').where({ id: candidate_id }).first('first_name', 'last_name');
    if (!user) throw new AppError('Candidate not found', 404);
    name = name || `${user.first_name} ${user.last_name}`.trim();
  }
  if (!name) throw new AppError('candidate_name is required when candidate_id is not provided', 422);
  if (stage && !STAGES.includes(stage)) throw new AppError('Invalid stage', 422);

  const [row] = await db('recruiter_project_members')
    .insert({ project_id: projectId, candidate_id: candidate_id || null, candidate_name: name, stage: stage || 'sourced', notes: notes || null, added_by: recruiterId })
    .returning('*');
  return row;
}

export async function updateMemberStage(recruiterId, projectId, memberId, { stage, notes } = {}) {
  await assertOwnedProject(recruiterId, projectId);
  const patch = {};
  if (stage !== undefined) {
    if (!STAGES.includes(stage)) throw new AppError('Invalid stage', 422);
    patch.stage = stage;
  }
  if (notes !== undefined) patch.notes = notes;
  if (!Object.keys(patch).length) throw new AppError('Nothing to update', 422);

  const [row] = await db('recruiter_project_members').where({ id: memberId, project_id: projectId }).update(patch).returning('*');
  if (!row) throw new AppError('Member not found', 404);

  if (stage === 'hired') {
    await db('recruiter_projects').where({ id: projectId }).update({ filled_hires: db.raw('filled_hires + 1'), updated_at: db.fn.now() });
  }
  return row;
}

export async function removeMember(recruiterId, projectId, memberId) {
  await assertOwnedProject(recruiterId, projectId);
  const count = await db('recruiter_project_members').where({ id: memberId, project_id: projectId }).del();
  if (!count) throw new AppError('Member not found', 404);
}
