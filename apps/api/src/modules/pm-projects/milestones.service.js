import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { emitEvent } from '../../common/events/outbox.js';
import { loadProjectContext, serializeMilestone } from './shared.js';
import { canEditProject, assertPermission } from './permissions.js';

async function assertProjectAccess(projectId, userId, trx = db) {
  const { membership } = await loadProjectContext(projectId, userId, trx);
  assertPermission(Boolean(membership), 'You do not have access to this project');
  return membership;
}

export async function listMilestones(projectId, userId) {
  await assertProjectAccess(projectId, userId);

  const rows = await db('pm_milestones').where({ project_id: projectId }).orderBy('target_date', 'asc');
  const milestoneIds = rows.map((r) => r.id);

  const [deliverableCounts, taskCounts] = await Promise.all([
    milestoneIds.length
      ? db('pm_deliverables').whereIn('milestone_id', milestoneIds).select('milestone_id').count('id as count').groupBy('milestone_id')
      : [],
    milestoneIds.length
      ? db('pm_tasks')
          .whereIn('milestone_id', milestoneIds)
          .groupBy('milestone_id')
          .select('milestone_id')
          .select(db.raw("count(*) as count, count(*) filter (where status = 'done') as done_count"))
      : [],
  ]);
  const deliverableCountByMilestone = new Map(deliverableCounts.map((r) => [r.milestone_id, Number(r.count)]));
  const taskCountByMilestone = new Map(taskCounts.map((r) => [r.milestone_id, { total: Number(r.count), done: Number(r.done_count || 0) }]));

  return rows.map((row) =>
    serializeMilestone(row, {
      deliverableCount: deliverableCountByMilestone.get(row.id) || 0,
      taskCount: taskCountByMilestone.get(row.id)?.total || 0,
      taskDoneCount: taskCountByMilestone.get(row.id)?.done || 0,
    })
  );
}

export async function createMilestone(projectId, userId, input) {
  return db.transaction(async (trx) => {
    const membership = await assertProjectAccess(projectId, userId, trx);
    assertPermission(canEditProject(membership), 'You do not have permission to manage milestones');

    const { name, description, targetDate, amount, status = 'planned' } = input;
    if (!name || !name.trim()) throw new AppError('Milestone name is required', 422);

    const [milestone] = await trx('pm_milestones')
      .insert({
        project_id: projectId,
        name: name.trim(),
        description: description || null,
        status,
        target_date: targetDate || null,
        amount: amount ?? null,
        created_by: userId,
      })
      .returning('*');

    await emitEvent({ aggregateType: 'pm_milestone', aggregateId: milestone.id, eventType: 'project.milestone_created', payload: { projectId, name: milestone.name } }, trx);
    return serializeMilestone(milestone, { deliverableCount: 0, taskCount: 0, taskDoneCount: 0 });
  });
}

export async function updateMilestone(projectId, userId, milestoneId, patch) {
  return db.transaction(async (trx) => {
    const membership = await assertProjectAccess(projectId, userId, trx);
    assertPermission(canEditProject(membership), 'You do not have permission to manage milestones');

    const existing = await trx('pm_milestones').where({ id: milestoneId, project_id: projectId }).first();
    if (!existing) throw new AppError('Milestone not found', 404);

    const update = {};
    for (const field of ['name', 'description', 'status', 'targetDate', 'amount', 'completionPct']) {
      if (field in patch) {
        const column = field.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
        update[column] = patch[field];
      }
    }
    if (Object.keys(update).length === 0) throw new AppError('No editable fields provided', 422);

    const [updated] = await trx('pm_milestones').where({ id: milestoneId }).update(update).returning('*');

    const eventType = patch.status === 'approved' ? 'project.milestone_approved' : patch.status === 'submitted' ? 'project.milestone_submitted' : 'project.milestone_updated';
    await emitEvent({ aggregateType: 'pm_milestone', aggregateId: milestoneId, eventType, payload: { projectId, fields: Object.keys(update) } }, trx);

    return serializeMilestone(updated);
  });
}

export async function deleteMilestone(projectId, userId, milestoneId) {
  return db.transaction(async (trx) => {
    const membership = await assertProjectAccess(projectId, userId, trx);
    assertPermission(canEditProject(membership), 'You do not have permission to manage milestones');
    const deleted = await trx('pm_milestones').where({ id: milestoneId, project_id: projectId }).del();
    if (!deleted) throw new AppError('Milestone not found', 404);
    await emitEvent({ aggregateType: 'pm_milestone', aggregateId: milestoneId, eventType: 'project.milestone_deleted', payload: { projectId } }, trx);
  });
}
