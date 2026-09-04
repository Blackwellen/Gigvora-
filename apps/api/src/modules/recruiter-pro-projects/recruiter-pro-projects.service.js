import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';

async function assertOwnedProject(userId, projectId) {
  const project = await db('recruiter_projects').where({ id: projectId, recruiter_id: userId }).first();
  if (!project) throw new AppError('Project not found', 404);
  return project;
}

// recruiter_projects (Domain 20) carries no automation/ATS columns of its
// own — Pro-tier automation state is derived from whether the project has
// any active sequences enrolling its pipeline candidates, and ATS sync
// state is derived from the most recent sync run for the caller's company
// (recruiter_projects has no direct ATS connection reference either).
export async function getAutomationStatus(userId, projectId) {
  await assertOwnedProject(userId, projectId);

  const activeSequences = await db('sequence_enrollments')
    .join('pipeline_candidates', 'pipeline_candidates.candidate_user_id', 'sequence_enrollments.candidate_user_id')
    .where('pipeline_candidates.project_id', projectId)
    .andWhere('sequence_enrollments.status', 'active')
    .countDistinct('sequence_enrollments.sequence_id as count')
    .first();

  const lastRun = await db('sequence_enrollments')
    .join('pipeline_candidates', 'pipeline_candidates.candidate_user_id', 'sequence_enrollments.candidate_user_id')
    .where('pipeline_candidates.project_id', projectId)
    .orderBy('sequence_enrollments.updated_at', 'desc')
    .first('sequence_enrollments.updated_at as last_run_at');

  const activeCount = Number(activeSequences?.count || 0);
  return {
    project_id: projectId,
    automation_enabled: activeCount > 0,
    active_sequences: activeCount,
    last_run_at: lastRun?.last_run_at || null,
  };
}

export async function listSlaBreaches(userId) {
  const projects = await db('recruiter_projects').where({ recruiter_id: userId }).select('id');
  const projectIds = projects.map((p) => p.id);
  if (!projectIds.length) return [];

  // A candidate is SLA-breaching if it has sat in a non-terminal stage for
  // more than 5 days without moving — a reasonable, documented default
  // since recruiter_projects defines no configurable SLA-per-stage value.
  const rows = await db('pipeline_candidates')
    .join('pipeline_stages', 'pipeline_stages.id', 'pipeline_candidates.stage_id')
    .whereIn('pipeline_candidates.project_id', projectIds)
    .whereNotIn('pipeline_stages.stage_type', ['hired', 'rejected'])
    .andWhere('pipeline_candidates.moved_at', '<', db.raw("now() - interval '5 days'"))
    .select(
      'pipeline_candidates.id',
      'pipeline_candidates.project_id',
      'pipeline_candidates.candidate_name',
      'pipeline_stages.name as stage_name',
      'pipeline_candidates.moved_at as breached_since',
    )
    .orderBy('pipeline_candidates.moved_at', 'asc');

  return rows;
}

export async function getAtsSync(userId, projectId) {
  await assertOwnedProject(userId, projectId);

  const connection = await db('ats_connections')
    .join('company_members', 'company_members.company_id', 'ats_connections.company_id')
    .where('company_members.user_id', userId)
    .andWhere('company_members.status', 'active')
    .orderBy('ats_connections.created_at', 'desc')
    .first('ats_connections.id', 'ats_connections.provider', 'ats_connections.status', 'ats_connections.last_synced_at');

  if (!connection) {
    return { project_id: projectId, provider: null, status: 'not_connected', last_synced_at: null };
  }

  // ats_connections.status is 'healthy'|'degraded'|'disconnected'|'pending';
  // the Recruiter Pro project widget uses a simpler sync-in-progress vocabulary.
  const STATUS_MAP = { healthy: 'synced', pending: 'syncing', degraded: 'error', disconnected: 'not_connected' };

  return {
    project_id: projectId,
    provider: connection.provider,
    status: STATUS_MAP[connection.status] || 'not_connected',
    last_synced_at: connection.last_synced_at,
  };
}
