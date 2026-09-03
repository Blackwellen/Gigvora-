import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { emitEvent } from '../../common/events/outbox.js';
import { loadProjectContext, serializeDeliverable } from './shared.js';
import { canEditProject, canManageTasks, assertPermission } from './permissions.js';

async function assertProjectAccess(projectId, userId, trx = db) {
  const { membership } = await loadProjectContext(projectId, userId, trx);
  assertPermission(Boolean(membership), 'You do not have access to this project');
  return membership;
}

export async function listDeliverables(projectId, userId) {
  await assertProjectAccess(projectId, userId);
  const rows = await db('pm_deliverables').where({ project_id: projectId }).orderBy('due_date', 'asc');
  return rows.map(serializeDeliverable);
}

export async function createDeliverable(projectId, userId, input) {
  return db.transaction(async (trx) => {
    const membership = await assertProjectAccess(projectId, userId, trx);
    assertPermission(canEditProject(membership), 'You do not have permission to create deliverables');

    const { title, description, milestoneId, ownerId, dueDate } = input;
    if (!title || !title.trim()) throw new AppError('Deliverable title is required', 422);

    const [deliverable] = await trx('pm_deliverables')
      .insert({
        project_id: projectId,
        milestone_id: milestoneId || null,
        title: title.trim(),
        description: description || null,
        owner_id: ownerId || null,
        due_date: dueDate || null,
      })
      .returning('*');

    await emitEvent({ aggregateType: 'pm_deliverable', aggregateId: deliverable.id, eventType: 'project.deliverable_created', payload: { projectId, title: deliverable.title } }, trx);
    return serializeDeliverable(deliverable);
  });
}

const REVIEW_ROLES_ONLY = new Set(['in_review', 'accepted', 'rejected']);

export async function updateDeliverable(projectId, userId, deliverableId, patch) {
  return db.transaction(async (trx) => {
    const membership = await assertProjectAccess(projectId, userId, trx);

    const existing = await trx('pm_deliverables').where({ id: deliverableId, project_id: projectId }).first();
    if (!existing) throw new AppError('Deliverable not found', 404);

    // Submitting your own deliverable ('submitted') only needs an accepted
    // membership; moving it into review/accepted/rejected is a reviewer
    // decision reserved for owner/manager (spec's approval semantics).
    if (patch.status && REVIEW_ROLES_ONLY.has(patch.status)) {
      assertPermission(canEditProject(membership), 'Only a project manager can review this deliverable');
    } else {
      assertPermission(canManageTasks(membership), 'You do not have permission to update this deliverable');
    }

    const update = {};
    for (const field of ['title', 'description', 'status', 'ownerId', 'dueDate', 'milestoneId']) {
      if (field in patch) {
        const column = field.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
        update[column] = patch[field];
      }
    }
    if (patch.status === 'submitted') update.submitted_at = trx.fn.now();
    if (Object.keys(update).length === 0) throw new AppError('No editable fields provided', 422);

    const [updated] = await trx('pm_deliverables').where({ id: deliverableId }).update(update).returning('*');

    const eventType = patch.status === 'submitted' ? 'project.deliverable_submitted' : patch.status === 'accepted' ? 'project.deliverable_accepted' : 'project.deliverable_updated';
    await emitEvent({ aggregateType: 'pm_deliverable', aggregateId: deliverableId, eventType, payload: { projectId, fields: Object.keys(update) } }, trx);

    return serializeDeliverable(updated);
  });
}

export async function deleteDeliverable(projectId, userId, deliverableId) {
  return db.transaction(async (trx) => {
    const membership = await assertProjectAccess(projectId, userId, trx);
    assertPermission(canEditProject(membership), 'You do not have permission to delete deliverables');
    const deleted = await trx('pm_deliverables').where({ id: deliverableId, project_id: projectId }).del();
    if (!deleted) throw new AppError('Deliverable not found', 404);
    await emitEvent({ aggregateType: 'pm_deliverable', aggregateId: deliverableId, eventType: 'project.deliverable_deleted', payload: { projectId } }, trx);
  });
}
