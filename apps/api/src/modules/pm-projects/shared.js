import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';

/** Fetches the acting user's membership row for a project, or null if they have none. */
export async function getMembership(projectId, userId, trx = db) {
  return trx('pm_project_members').where({ project_id: projectId, user_id: userId }).first();
}

/** Fetches the project row, or throws 404 if it doesn't exist. */
export async function getProjectOrThrow(projectId, trx = db) {
  const project = await trx('pm_projects').where({ id: projectId }).first();
  if (!project) throw new AppError('Project not found', 404);
  return project;
}

/** Loads a project + the acting user's membership together — the shape almost every handler needs. */
export async function loadProjectContext(projectId, userId, trx = db) {
  const [project, membership] = await Promise.all([getProjectOrThrow(projectId, trx), getMembership(projectId, userId, trx)]);
  return { project, membership };
}

export function serializeProject(row, extra = {}) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    status: row.status,
    projectType: row.project_type,
    category: row.category,
    countryCode: row.country_code,
    workspaceType: row.workspace_type,
    companyId: row.company_id,
    ownerId: row.owner_id,
    clientName: row.client_name,
    sourceMarketplaceProjectId: row.source_marketplace_project_id,
    startDate: row.start_date,
    targetEndDate: row.target_end_date,
    actualEndDate: row.actual_end_date,
    progressPct: row.progress_pct,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...extra,
  };
}

export function serializeTask(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    parentTaskId: row.parent_task_id,
    milestoneId: row.milestone_id,
    deliverableId: row.deliverable_id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    assigneeId: row.assignee_id,
    reporterId: row.reporter_id,
    dueDate: row.due_date,
    startDate: row.start_date,
    estimateHours: row.estimate_hours !== null ? Number(row.estimate_hours) : null,
    boardColumn: row.board_column,
    boardOrder: row.board_order,
    labels: row.labels || [],
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function serializeMilestone(row, extra = {}) {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    description: row.description,
    status: row.status,
    targetDate: row.target_date,
    amount: row.amount !== null && row.amount !== undefined ? Number(row.amount) : null,
    completionPct: row.completion_pct,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...extra,
  };
}

export function serializeDeliverable(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    milestoneId: row.milestone_id,
    title: row.title,
    description: row.description,
    status: row.status,
    ownerId: row.owner_id,
    dueDate: row.due_date,
    submittedAt: row.submitted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function serializeMember(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    userId: row.user_id,
    role: row.role,
    customRoleLabel: row.custom_role_label,
    invitationStatus: row.invitation_status,
    invitedBy: row.invited_by,
    joinedAt: row.joined_at,
    firstName: row.first_name,
    lastName: row.last_name,
    avatarUrl: row.avatar_url,
  };
}
