// Domain 18 Phase B — Dependencies (18.28), backed by pm_task_dependencies
// (created in Phase A alongside pm_tasks but left unused until now).
import { Router } from 'express';
import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { emitEvent } from '../../common/events/outbox.js';
import { loadProjectContext } from './shared.js';
import { canManageTasks, assertPermission } from './permissions.js';
import { wouldCreateCycle } from './dependencyGraph.js';

export { wouldCreateCycle };

async function assertAccess(projectId, userId) {
  const { membership } = await loadProjectContext(projectId, userId);
  assertPermission(Boolean(membership), 'You do not have access to this project');
  return membership;
}

export const router = Router({ mergeParams: true });

router.get('/', asyncHandler(async (req, res) => {
  await assertAccess(req.params.id, req.user.sub);
  const rows = await db('pm_task_dependencies as d')
    .join('pm_tasks as t', 't.id', 'd.task_id')
    .where('t.project_id', req.params.id)
    .select('d.*');
  res.json({
    data: rows.map((r) => ({ id: r.id, taskId: r.task_id, dependsOnTaskId: r.depends_on_task_id, dependencyType: r.dependency_type, createdAt: r.created_at })),
  });
}));

router.post('/', asyncHandler(async (req, res) => {
  const membership = await assertAccess(req.params.id, req.user.sub);
  assertPermission(canManageTasks(membership), 'You do not have permission to manage dependencies');

  const { taskId, dependsOnTaskId, dependencyType = 'finish_to_start' } = req.body;
  if (!taskId || !dependsOnTaskId) throw new AppError('taskId and dependsOnTaskId are required', 422);

  const [task, dependsOn] = await Promise.all([
    db('pm_tasks').where({ id: taskId, project_id: req.params.id }).first('id'),
    db('pm_tasks').where({ id: dependsOnTaskId, project_id: req.params.id }).first('id'),
  ]);
  if (!task || !dependsOn) throw new AppError('Both tasks must belong to this project', 404);

  const existingEdges = await db('pm_task_dependencies as d')
    .join('pm_tasks as t', 't.id', 'd.task_id')
    .where('t.project_id', req.params.id)
    .select('d.task_id', 'd.depends_on_task_id');
  const edges = existingEdges.map((e) => ({ taskId: e.task_id, dependsOnTaskId: e.depends_on_task_id }));

  if (wouldCreateCycle(edges, taskId, dependsOnTaskId)) {
    throw new AppError('This dependency would create a circular chain', 422, { code: 'CIRCULAR_DEPENDENCY' });
  }

  const [row] = await db('pm_task_dependencies').insert({ task_id: taskId, depends_on_task_id: dependsOnTaskId, dependency_type: dependencyType }).returning('*');
  await emitEvent({ aggregateType: 'pm_task', aggregateId: taskId, eventType: 'project.dependency_created', payload: { projectId: req.params.id, dependsOnTaskId } });
  res.status(201).json({ data: { id: row.id, taskId: row.task_id, dependsOnTaskId: row.depends_on_task_id, dependencyType: row.dependency_type } });
}));

router.delete('/:dependencyId', asyncHandler(async (req, res) => {
  const membership = await assertAccess(req.params.id, req.user.sub);
  assertPermission(canManageTasks(membership), 'You do not have permission to manage dependencies');
  const deleted = await db('pm_task_dependencies').where({ id: req.params.dependencyId }).del();
  if (!deleted) throw new AppError('Dependency not found', 404);
  res.status(204).end();
}));

export default router;
