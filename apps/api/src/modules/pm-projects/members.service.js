import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { emitEvent } from '../../common/events/outbox.js';
import { loadProjectContext, serializeMember } from './shared.js';
import { canManageMembers, assertPermission } from './permissions.js';

export async function listMembers(projectId, userId) {
  const { membership } = await loadProjectContext(projectId, userId);
  assertPermission(Boolean(membership), 'You do not have access to this project');

  const rows = await db('pm_project_members as m')
    .join('users as u', 'u.id', 'm.user_id')
    .leftJoin('profiles as p', 'p.user_id', 'u.id')
    .where('m.project_id', projectId)
    .select('m.*', 'u.first_name', 'u.last_name', 'p.avatar_url');

  return rows.map(serializeMember);
}

export async function addMember(projectId, userId, { userId: newUserId, role = 'professional' }) {
  return db.transaction(async (trx) => {
    const { membership } = await loadProjectContext(projectId, userId, trx);
    assertPermission(canManageMembers(membership), 'You do not have permission to manage members');

    const targetUser = await trx('users').where({ id: newUserId }).first('id');
    if (!targetUser) throw new AppError('User not found', 404);

    const existing = await trx('pm_project_members').where({ project_id: projectId, user_id: newUserId }).first();
    if (existing) throw new AppError('This person is already a member of the project', 409);

    const [member] = await trx('pm_project_members')
      .insert({
        project_id: projectId,
        user_id: newUserId,
        role,
        invited_by: userId,
        invitation_status: 'accepted',
        joined_at: trx.fn.now(),
      })
      .returning('*');

    await emitEvent({ aggregateType: 'pm_project', aggregateId: projectId, eventType: 'project.member_added', payload: { userId: newUserId, role } }, trx);

    return serializeMember({ ...member, first_name: null, last_name: null, avatar_url: null });
  });
}

export async function updateMemberRole(projectId, userId, memberId, role) {
  return db.transaction(async (trx) => {
    const { membership } = await loadProjectContext(projectId, userId, trx);
    assertPermission(canManageMembers(membership), 'You do not have permission to manage members');

    const [updated] = await trx('pm_project_members').where({ id: memberId, project_id: projectId }).update({ role }).returning('*');
    if (!updated) throw new AppError('Member not found', 404);

    await emitEvent({ aggregateType: 'pm_project', aggregateId: projectId, eventType: 'project.member_role_changed', payload: { memberId, role } }, trx);
    return serializeMember(updated);
  });
}

export async function removeMember(projectId, userId, memberId) {
  return db.transaction(async (trx) => {
    const { membership } = await loadProjectContext(projectId, userId, trx);
    assertPermission(canManageMembers(membership), 'You do not have permission to manage members');

    const target = await trx('pm_project_members').where({ id: memberId, project_id: projectId }).first();
    if (!target) throw new AppError('Member not found', 404);
    if (target.role === 'owner') throw new AppError('The project owner cannot be removed', 422);

    await trx('pm_project_members').where({ id: memberId }).del();
    await emitEvent({ aggregateType: 'pm_project', aggregateId: projectId, eventType: 'project.member_removed', payload: { userId: target.user_id } }, trx);
  });
}
