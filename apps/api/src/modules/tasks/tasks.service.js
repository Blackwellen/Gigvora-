import { db } from '../../db/connection.js';

const TABLE = 'tasks';

/**
 * Auth-scoped list for the top-bar tasks widget: the current user's
 * upcoming/open tasks, soonest due date first (undated tasks last).
 */
export async function listUpcoming(userId, { status = 'open', limit = 10 } = {}) {
  const query = db(TABLE).where({ user_id: userId }).orderByRaw('due_at IS NULL, due_at asc').limit(limit);

  if (status && status !== 'all') query.andWhere({ status });

  const rows = await query.select('id', 'title', 'description', 'status', 'priority', 'due_at', 'completed_at', 'created_at');

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    status: r.status,
    priority: r.priority,
    dueAt: r.due_at,
    completedAt: r.completed_at,
    createdAt: r.created_at,
  }));
}

const ALLOWED_STATUSES = ['open', 'in_progress', 'completed', 'cancelled'];

export async function updateStatus(userId, taskId, status) {
  if (!ALLOWED_STATUSES.includes(status)) {
    const err = new Error('Invalid task status');
    err.status = 422;
    throw err;
  }

  const patch = { status, completed_at: status === 'completed' ? db.fn.now() : null };
  const [row] = await db(TABLE)
    .where({ id: taskId, user_id: userId })
    .update(patch)
    .returning(['id', 'title', 'description', 'status', 'priority', 'due_at', 'completed_at', 'created_at']);

  if (!row) {
    const err = new Error('Task not found');
    err.status = 404;
    throw err;
  }

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    dueAt: row.due_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  };
}
