import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { resolveRecruiterCompanyId } from '../../common/utils/resolveRecruiterCompany.js';

function toEvent(row) {
  return {
    id: row.id,
    project_id: row.project_id,
    project_name: row.project_name || null,
    event_type: row.event_type,
    actor_id: row.actor_user_id,
    actor_name: row.actor_first_name || row.actor_last_name ? `${row.actor_first_name || ''} ${row.actor_last_name || ''}`.trim() : 'Team member',
    actor_avatar_url: row.actor_avatar_url || null,
    body: row.body,
    created_at: row.created_at,
  };
}

export async function listEvents(userId, { projectId } = {}) {
  const companyId = await resolveRecruiterCompanyId(userId);
  const qb = db('recruiter_collaboration_events as e')
    .where({ 'e.company_id': companyId })
    .leftJoin('recruiter_projects as p', 'p.id', 'e.project_id')
    .leftJoin('users as u', 'u.id', 'e.actor_user_id')
    .leftJoin('profiles as pr', 'pr.user_id', 'e.actor_user_id')
    .select(
      'e.*',
      'p.name as project_name',
      'u.first_name as actor_first_name',
      'u.last_name as actor_last_name',
      'pr.avatar_url as actor_avatar_url',
    );
  if (projectId) qb.andWhere('e.project_id', projectId);
  const rows = await qb.orderBy('e.created_at', 'desc').limit(200);
  return rows.map(toEvent);
}

export async function postComment(userId, { project_id, projectId, body } = {}) {
  const companyId = await resolveRecruiterCompanyId(userId);
  if (!body?.trim()) throw new AppError('body is required', 422);
  const resolvedProjectId = project_id || projectId || null;
  const [row] = await db('recruiter_collaboration_events')
    .insert({
      company_id: companyId,
      project_id: resolvedProjectId,
      actor_user_id: userId,
      event_type: 'comment',
      body: body.trim(),
    })
    .returning('*');

  let project_name = null;
  if (resolvedProjectId) {
    const project = await db('recruiter_projects').where({ id: resolvedProjectId }).first('name');
    project_name = project?.name || null;
  }
  const user = await db('users').where({ id: userId }).first('first_name', 'last_name');
  const profile = await db('profiles').where({ user_id: userId }).first('avatar_url');

  return toEvent({
    ...row,
    project_name,
    actor_first_name: user?.first_name,
    actor_last_name: user?.last_name,
    actor_avatar_url: profile?.avatar_url,
  });
}
