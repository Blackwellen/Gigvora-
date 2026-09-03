import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { aiTaskQueue } from '../../jobs/queues/index.js';

// Real registered task types only — creating a task with an unregistered
// type is rejected rather than silently queued to do nothing.
export const TASK_TYPES = new Set(['bulk_conversation_summary']);

export async function createTask(userId, { taskType, inputRef = {}, priority = 'normal' }) {
  if (!TASK_TYPES.has(taskType)) throw new AppError(`Unknown task type "${taskType}"`, 422);

  const [task] = await db('ai_tasks').insert({ requested_by: userId, task_type: taskType, priority, input_ref: JSON.stringify(inputRef) }).returning('*');
  await db('ai_task_events').insert({ task_id: task.id, event_type: 'queued', metadata: JSON.stringify({}) });
  await aiTaskQueue.add(taskType, { taskId: task.id }, { jobId: task.id });

  return mapTask(task);
}

export async function listTasks(userId, { status, limit = 25, offset = 0 } = {}) {
  let query = db('ai_tasks').where({ requested_by: userId });
  if (status) query = query.andWhere('status', status);
  const [rows, totalRow] = await Promise.all([
    query.clone().orderBy('created_at', 'desc').limit(limit).offset(offset),
    query.clone().count('id as count').first(),
  ]);
  return { total: Number(totalRow.count), tasks: rows.map(mapTask) };
}

export async function getTask(userId, taskId) {
  const row = await db('ai_tasks').where({ id: taskId, requested_by: userId }).first();
  if (!row) throw new AppError('Task not found', 404);
  const events = await db('ai_task_events').where({ task_id: taskId }).orderBy('created_at', 'asc');
  return { ...mapTask(row), events: events.map((e) => ({ eventType: e.event_type, metadata: e.metadata, createdAt: e.created_at })) };
}

export async function cancelTask(userId, taskId) {
  const row = await db('ai_tasks').where({ id: taskId, requested_by: userId }).first();
  if (!row) throw new AppError('Task not found', 404);
  if (!['queued', 'running'].includes(row.status)) throw new AppError('Only a queued or running task can be cancelled', 422);

  const job = await aiTaskQueue.getJob(taskId);
  if (job) await job.remove().catch(() => {});

  await db('ai_tasks').where({ id: taskId }).update({ status: 'cancelled', updated_at: db.fn.now() });
  await db('ai_task_events').insert({ task_id: taskId, event_type: 'cancelled', metadata: JSON.stringify({}) });
  return getTask(userId, taskId);
}

function mapTask(t) {
  return {
    id: t.id,
    taskType: t.task_type,
    status: t.status,
    priority: t.priority,
    progress: t.progress,
    costEstimate: t.cost_estimate === null ? null : Number(t.cost_estimate),
    creditsUsed: t.credits_used,
    inputRef: t.input_ref,
    outputRef: t.output_ref,
    startedAt: t.started_at,
    completedAt: t.completed_at,
    failedAt: t.failed_at,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  };
}
