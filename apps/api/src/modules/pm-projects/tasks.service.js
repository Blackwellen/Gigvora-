import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { emitEvent } from '../../common/events/outbox.js';
import { redis } from '../../cache/redis.js';
import { loadProjectContext, serializeTask } from './shared.js';
import { canManageTasks, assertPermission } from './permissions.js';
import { sortBySuggestedOrder } from './taskOrdering.js';

export { sortBySuggestedOrder };

async function assertProjectAccess(projectId, userId, trx = db) {
  const { membership } = await loadProjectContext(projectId, userId, trx);
  assertPermission(Boolean(membership), 'You do not have access to this project');
  return membership;
}

export async function listTasks(projectId, userId, { status, assigneeId, priority, search } = {}) {
  await assertProjectAccess(projectId, userId);

  const query = db('pm_tasks').where({ project_id: projectId });
  if (status) query.andWhere('status', status);
  if (assigneeId) query.andWhere('assignee_id', assigneeId);
  if (priority) query.andWhere('priority', priority);
  if (search) query.andWhereILike('title', `%${search}%`);

  const rows = await query.orderBy('due_date', 'asc');
  return rows.map(serializeTask);
}

export async function getBoard(projectId, userId) {
  await assertProjectAccess(projectId, userId);
  const rows = await db('pm_tasks').where({ project_id: projectId }).orderBy('board_order', 'asc');
  return rows.map(serializeTask);
}

export async function createTask(projectId, userId, input) {
  return db.transaction(async (trx) => {
    await assertProjectAccess(projectId, userId, trx);
    const { title, description, priority = 'medium', assigneeId, dueDate, startDate, estimateHours, milestoneId, deliverableId, parentTaskId, boardColumn = 'todo' } = input;
    if (!title || !title.trim()) throw new AppError('Task title is required', 422);

    const maxOrderRow = await trx('pm_tasks').where({ project_id: projectId, board_column: boardColumn }).max('board_order as max').first();
    const boardOrder = (maxOrderRow?.max ?? -1) + 1;

    const [task] = await trx('pm_tasks')
      .insert({
        project_id: projectId,
        parent_task_id: parentTaskId || null,
        milestone_id: milestoneId || null,
        deliverable_id: deliverableId || null,
        title: title.trim(),
        description: description || null,
        priority,
        assignee_id: assigneeId || null,
        reporter_id: userId,
        due_date: dueDate || null,
        start_date: startDate || null,
        estimate_hours: estimateHours ?? null,
        board_column: boardColumn,
        board_order: boardOrder,
        created_by: userId,
      })
      .returning('*');

    await emitEvent({ aggregateType: 'pm_task', aggregateId: task.id, eventType: 'project.task_created', payload: { projectId, title: task.title } }, trx);
    return serializeTask(task);
  });
}

export async function updateTask(projectId, userId, taskId, patch) {
  return db.transaction(async (trx) => {
    const membership = await assertProjectAccess(projectId, userId, trx);
    assertPermission(canManageTasks(membership), 'You do not have permission to manage tasks');

    const existing = await trx('pm_tasks').where({ id: taskId, project_id: projectId }).first();
    if (!existing) throw new AppError('Task not found', 404);

    const update = { version: existing.version + 1 };
    for (const field of ['title', 'description', 'status', 'priority', 'assigneeId', 'dueDate', 'startDate', 'estimateHours', 'milestoneId', 'deliverableId']) {
      if (field in patch) {
        const column = field.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
        update[column] = patch[field];
      }
    }

    const [updated] = await trx('pm_tasks').where({ id: taskId, version: existing.version }).update(update).returning('*');
    if (!updated) throw new AppError('Task was modified by someone else — please refresh and try again', 409, { code: 'VERSION_CONFLICT' });

    const eventType = patch.status === 'done' ? 'project.task_completed' : 'project.task_updated';
    await emitEvent({ aggregateType: 'pm_task', aggregateId: taskId, eventType, payload: { projectId, fields: Object.keys(update) } }, trx);

    await broadcastTaskChange(projectId, serializeTask(updated));
    return serializeTask(updated);
  });
}

export async function deleteTask(projectId, userId, taskId) {
  return db.transaction(async (trx) => {
    const membership = await assertProjectAccess(projectId, userId, trx);
    assertPermission(canManageTasks(membership), 'You do not have permission to manage tasks');
    const deleted = await trx('pm_tasks').where({ id: taskId, project_id: projectId }).del();
    if (!deleted) throw new AppError('Task not found', 404);
    await emitEvent({ aggregateType: 'pm_task', aggregateId: taskId, eventType: 'project.task_deleted', payload: { projectId } }, trx);
    await broadcastTaskChange(projectId, { id: taskId, deleted: true });
  });
}

/**
 * Kanban drag/drop move. Transactional + optimistic-version-checked so two
 * concurrent drags on the same card reconcile instead of silently clobbering
 * each other (spec §9/§36) — the client is expected to treat a 409 as a
 * signal to re-fetch the board and reconcile its optimistic UI state.
 */
export async function moveTask(projectId, userId, taskId, { boardColumn, boardOrder, version }) {
  return db.transaction(async (trx) => {
    const membership = await assertProjectAccess(projectId, userId, trx);
    assertPermission(canManageTasks(membership), 'You do not have permission to manage tasks');

    const existing = await trx('pm_tasks').where({ id: taskId, project_id: projectId }).forUpdate().first();
    if (!existing) throw new AppError('Task not found', 404);
    if (typeof version === 'number' && version !== existing.version) {
      throw new AppError('This task moved since you last saw it — refreshing the board', 409, { code: 'VERSION_CONFLICT' });
    }

    // Shift existing cards in the destination column to make room, then place this one.
    await trx('pm_tasks')
      .where({ project_id: projectId, board_column: boardColumn })
      .andWhere('board_order', '>=', boardOrder)
      .increment('board_order', 1);

    const statusForColumn = boardColumn === 'done' ? 'done' : existing.status === 'done' ? 'in_progress' : existing.status;

    const [updated] = await trx('pm_tasks')
      .where({ id: taskId })
      .update({ board_column: boardColumn, board_order: boardOrder, status: statusForColumn, version: existing.version + 1 })
      .returning('*');

    await emitEvent(
      { aggregateType: 'pm_task', aggregateId: taskId, eventType: 'project.task_updated', payload: { projectId, boardColumn, boardOrder } },
      trx
    );

    const serialized = serializeTask(updated);
    await broadcastTaskChange(projectId, serialized);
    return serialized;
  });
}

/**
 * Best-effort low-latency fan-out on its own channel (mirrors emitEvent's
 * REALTIME_AGGREGATES pattern) so the board realtime bridge
 * (websocket/handlers/projectHandlers.js) can push to everyone viewing
 * `project:<id>` without waiting on outbox consumers.
 */
async function broadcastTaskChange(projectId, task) {
  await redis.publish('project-events', JSON.stringify({ projectId, type: 'task', task })).catch(() => {});
}
