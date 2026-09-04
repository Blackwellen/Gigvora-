import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { emitEvent } from '../../common/events/outbox.js';
import { getProjectOrThrow, loadProjectContext, serializeProject, serializePublicProject } from './shared.js';
import { canEditProject, canDeleteProject, assertPermission } from './permissions.js';
import { isValidProjectCategory } from '../../common/taxonomies/projectCategories.js';
import { isValidCountryCode } from '../../common/taxonomies/countries.js';

function slugify(name) {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'project'
  );
}

async function uniqueSlug(name, trx = db) {
  const base = slugify(name);
  let candidate = base;
  let n = 1;
  // Small, bounded loop — project creation is a low-frequency, user-driven
  // action, so a handful of existence checks here is not a hot path.
  while (await trx('pm_projects').where({ slug: candidate }).first('id')) {
    n += 1;
    candidate = `${base}-${n}`;
  }
  return candidate;
}

export async function listProjects(userId, { status, search, category, countryCode, sort = 'updated_desc', page = 1, pageSize = 20 } = {}) {
  const query = db('pm_projects as p')
    .join('pm_project_members as m', 'm.project_id', 'p.id')
    .where('m.user_id', userId)
    .andWhere('m.invitation_status', 'accepted');

  if (status) query.andWhere('p.status', status);
  if (category) query.andWhere('p.category', category);
  if (countryCode) query.andWhere('p.country_code', countryCode.toUpperCase());
  if (search) {
    query.andWhere((qb) => qb.whereILike('p.name', `%${search}%`).orWhereILike('p.client_name', `%${search}%`));
  }

  const sortMap = {
    updated_desc: ['p.updated_at', 'desc'],
    name_asc: ['p.name', 'asc'],
    due_asc: ['p.target_end_date', 'asc'],
  };
  const [sortCol, sortDir] = sortMap[sort] || sortMap.updated_desc;

  const countRow = await query.clone().count('p.id as count').first();
  const total = Number(countRow?.count || 0);

  const rows = await query
    .clone()
    .select('p.*', 'm.role as my_role')
    .orderBy(sortCol, sortDir)
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const projectIds = rows.map((r) => r.id);
  const [taskCounts, memberCounts] = await Promise.all([
    projectIds.length
      ? db('pm_tasks')
          .whereIn('project_id', projectIds)
          .groupBy('project_id')
          .select('project_id')
          .select(db.raw("count(*) as count, count(*) filter (where status = 'done') as done_count"))
      : [],
    projectIds.length
      ? db('pm_project_members').whereIn('project_id', projectIds).where('invitation_status', 'accepted').select('project_id').count('id as count').groupBy('project_id')
      : [],
  ]);
  const taskCountByProject = new Map(taskCounts.map((r) => [r.project_id, { total: Number(r.count), done: Number(r.done_count || 0) }]));
  const memberCountByProject = new Map(memberCounts.map((r) => [r.project_id, Number(r.count)]));

  return {
    data: rows.map((row) =>
      serializeProject(row, {
        myRole: row.my_role,
        taskCount: taskCountByProject.get(row.id)?.total || 0,
        taskDoneCount: taskCountByProject.get(row.id)?.done || 0,
        memberCount: memberCountByProject.get(row.id) || 0,
      })
    ),
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  };
}

export async function getProject(projectId, userId) {
  const { project, membership } = await loadProjectContext(projectId, userId);
  assertPermission(Boolean(membership), 'You do not have access to this project');

  const [taskStats, memberCount, milestoneCount] = await Promise.all([
    db('pm_tasks')
      .where({ project_id: projectId })
      .select(db.raw("count(*) as total, count(*) filter (where status = 'done') as done, count(*) filter (where status <> 'done' and due_date < current_date) as overdue"))
      .first(),
    db('pm_project_members').where({ project_id: projectId, invitation_status: 'accepted' }).count('id as count').first(),
    db('pm_milestones').where({ project_id: projectId }).count('id as count').first(),
  ]);

  return serializeProject(project, {
    myRole: membership.role,
    taskCount: Number(taskStats?.total || 0),
    taskDoneCount: Number(taskStats?.done || 0),
    taskOverdueCount: Number(taskStats?.overdue || 0),
    memberCount: Number(memberCount?.count || 0),
    milestoneCount: Number(milestoneCount?.count || 0),
  });
}

export async function createProject(userId, input) {
  const { name, description, projectType = 'internal', category, countryCode, clientName, startDate, targetEndDate, workspaceType = 'personal', companyId } = input;
  if (!name || !name.trim()) throw new AppError('Project name is required', 422);
  if (category !== undefined && category !== null && !isValidProjectCategory(category)) {
    throw new AppError(`"${category}" is not a recognized project category`, 422, { code: 'INVALID_CATEGORY' });
  }
  if (countryCode !== undefined && countryCode !== null && !isValidCountryCode(countryCode)) {
    throw new AppError(`"${countryCode}" is not a recognized country code`, 422, { code: 'INVALID_COUNTRY' });
  }

  return db.transaction(async (trx) => {
    const slug = await uniqueSlug(name, trx);
    const [project] = await trx('pm_projects')
      .insert({
        workspace_type: workspaceType,
        company_id: companyId || null,
        owner_id: userId,
        name: name.trim(),
        slug,
        description: description || null,
        project_type: projectType,
        category: category || null,
        country_code: countryCode ? countryCode.toUpperCase() : null,
        client_name: clientName || null,
        start_date: startDate || null,
        target_end_date: targetEndDate || null,
        created_by: userId,
      })
      .returning('*');

    await trx('pm_project_members').insert({
      project_id: project.id,
      user_id: userId,
      role: 'owner',
      invitation_status: 'accepted',
      joined_at: trx.fn.now(),
    });

    await emitEvent({ aggregateType: 'pm_project', aggregateId: project.id, eventType: 'project.created', payload: { name: project.name } }, trx);

    return serializeProject(project, { myRole: 'owner', taskCount: 0, taskDoneCount: 0, memberCount: 1, milestoneCount: 0 });
  });
}

export async function updateProject(projectId, userId, patch) {
  return db.transaction(async (trx) => {
    const { project, membership } = await loadProjectContext(projectId, userId, trx);
    assertPermission(canEditProject(membership), 'You do not have permission to edit this project');

    if (patch.category !== undefined && patch.category !== null && !isValidProjectCategory(patch.category)) {
      throw new AppError(`"${patch.category}" is not a recognized project category`, 422, { code: 'INVALID_CATEGORY' });
    }
    if (patch.countryCode !== undefined && patch.countryCode !== null && !isValidCountryCode(patch.countryCode)) {
      throw new AppError(`"${patch.countryCode}" is not a recognized country code`, 422, { code: 'INVALID_COUNTRY' });
    }

    const update = { updated_by: userId, version: project.version + 1 };
    for (const field of ['name', 'description', 'status', 'projectType', 'category', 'countryCode', 'clientName', 'startDate', 'targetEndDate', 'actualEndDate', 'progressPct', 'openToBids']) {
      if (field in patch) {
        const column = field.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
        update[column] = field === 'countryCode' && patch[field] ? patch[field].toUpperCase() : patch[field];
      }
    }

    const [updated] = await trx('pm_projects')
      .where({ id: projectId, version: project.version })
      .update(update)
      .returning('*');

    if (!updated) throw new AppError('Project was modified by someone else — please refresh and try again', 409, { code: 'VERSION_CONFLICT' });

    await emitEvent({ aggregateType: 'pm_project', aggregateId: projectId, eventType: 'project.updated', payload: { fields: Object.keys(update) } }, trx);

    return serializeProject(updated, { myRole: membership.role });
  });
}

export async function deleteProject(projectId, userId) {
  return db.transaction(async (trx) => {
    const { membership } = await loadProjectContext(projectId, userId, trx);
    assertPermission(canDeleteProject(membership), 'Only the project owner can delete this project');
    await trx('pm_projects').where({ id: projectId }).del();
    await emitEvent({ aggregateType: 'pm_project', aggregateId: projectId, eventType: 'project.deleted', payload: {} }, trx);
  });
}

/**
 * Marketplace discovery — projects an owner/manager has explicitly opted
 * into bidding (open_to_bids = true) and that are actively accepting work.
 * Deliberately requires no membership: this is the discovery surface a
 * freelancer who isn't on the project yet needs in order to find it and
 * submit a proposal via POST /pm-projects/:id/bids. Only public-safe fields
 * are selected/returned — see serializePublicProject.
 */
export async function listMarketplaceProjects({ category, countryCode, search, page = 1, pageSize = 20 } = {}) {
  if (category !== undefined && category !== null && category !== '' && !isValidProjectCategory(category)) {
    throw new AppError(`"${category}" is not a recognized project category`, 422, { code: 'INVALID_CATEGORY' });
  }
  if (countryCode !== undefined && countryCode !== null && countryCode !== '' && !isValidCountryCode(countryCode)) {
    throw new AppError(`"${countryCode}" is not a recognized country code`, 422, { code: 'INVALID_COUNTRY' });
  }

  const query = db('pm_projects as p').where('p.open_to_bids', true).andWhere('p.status', 'active');
  if (category) query.andWhere('p.category', category);
  if (countryCode) query.andWhere('p.country_code', countryCode.toUpperCase());
  if (search) {
    query.andWhere((qb) => qb.whereILike('p.name', `%${search}%`).orWhereILike('p.description', `%${search}%`));
  }

  const countRow = await query.clone().count('p.id as count').first();
  const total = Number(countRow?.count || 0);

  const rows = await query
    .clone()
    .select('p.*')
    .orderBy('p.created_at', 'desc')
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return {
    data: rows.map((row) => serializePublicProject(row)),
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  };
}

/**
 * Single-project brief — the non-membership-gated counterpart to
 * getProject(). If the caller is already a member, mirrors the same
 * serialized shape getProject() would give them (so a member clicking
 * through from search/marketplace sees the real project, not a stripped
 * preview of themselves). If they aren't a member, the project must be
 * open_to_bids or this 404s exactly like a project that doesn't exist —
 * deliberately not distinguishing "private" from "not found" so a private
 * project's existence isn't leaked to non-members.
 */
export async function getProjectBrief(projectId, userId) {
  const { project, membership } = await loadProjectContext(projectId, userId);

  if (membership) {
    return serializeProject(project, { myRole: membership.role, isMember: true });
  }

  if (!project.open_to_bids) {
    throw new AppError('Project not found', 404);
  }

  return { ...serializePublicProject(project), isMember: false };
}

export { getProjectOrThrow };
