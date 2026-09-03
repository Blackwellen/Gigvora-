// Domain 18 Phase B — Time Tracking (18.14), backed by the pm_time_entries
// table created in Phase A. Manual entries and a start/stop timer (a timer
// is just an entry created at start with minutes filled in on stop — no
// separate "active timer" table needed since only one entry can be
// in-flight per user per project, enforced by rejecting a second start
// while one is already open).
//
// Desktop activity tracker (screenshots, keyboard/mouse activity counts,
// idle detection): spec §17 requires this to be consent-based, visibly
// indicated, pausable, and policy-configurable — that is a distinct client
// application plus its own capture/consent/retention pipeline, not a REST
// resource this phase can respons­ibly stand up without a real desktop
// client to pair it with. Deferred; documented so it is not silently
// missing from the contract.
import { Router } from 'express';
import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { emitEvent } from '../../common/events/outbox.js';
import { loadProjectContext } from './shared.js';
import { assertPermission } from './permissions.js';

function serializeEntry(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    taskId: row.task_id,
    userId: row.user_id,
    occurredOn: row.occurred_on,
    minutes: row.minutes,
    notes: row.notes,
    billable: row.billable,
    source: row.source,
    running: row.source === 'timer' && row.minutes === 0,
    createdAt: row.created_at,
  };
}

async function assertAccess(projectId, userId) {
  const { membership } = await loadProjectContext(projectId, userId);
  assertPermission(Boolean(membership), 'You do not have access to this project');
  return membership;
}

export const router = Router({ mergeParams: true });

router.get('/', asyncHandler(async (req, res) => {
  await assertAccess(req.params.id, req.user.sub);
  const query = db('pm_time_entries').where({ project_id: req.params.id });
  if (req.query.userId) query.andWhere('user_id', req.query.userId);
  if (req.query.mine === 'true') query.andWhere('user_id', req.user.sub);
  const rows = await query.orderBy('occurred_on', 'desc');
  res.json({ data: rows.map(serializeEntry) });
}));

router.post('/', asyncHandler(async (req, res) => {
  await assertAccess(req.params.id, req.user.sub);
  const { taskId, occurredOn, minutes, notes, billable = true } = req.body;
  if (!occurredOn || !Number.isFinite(Number(minutes)) || Number(minutes) <= 0) {
    throw new AppError('occurredOn and a positive minutes value are required', 422);
  }

  const [row] = await db('pm_time_entries')
    .insert({ project_id: req.params.id, task_id: taskId || null, user_id: req.user.sub, occurred_on: occurredOn, minutes: Math.round(Number(minutes)), notes: notes || null, billable, source: 'manual' })
    .returning('*');

  await emitEvent({ aggregateType: 'pm_time_entry', aggregateId: row.id, eventType: 'project.time_logged', payload: { projectId: req.params.id, minutes: row.minutes } });
  res.status(201).json({ data: serializeEntry(row) });
}));

router.post('/timer/start', asyncHandler(async (req, res) => {
  await assertAccess(req.params.id, req.user.sub);
  const existing = await db('pm_time_entries').where({ project_id: req.params.id, user_id: req.user.sub, source: 'timer', minutes: 0 }).first();
  if (existing) throw new AppError('A timer is already running for this project', 409, { code: 'TIMER_ALREADY_RUNNING', entryId: existing.id });

  const [row] = await db('pm_time_entries')
    .insert({ project_id: req.params.id, task_id: req.body.taskId || null, user_id: req.user.sub, occurred_on: new Date().toISOString().slice(0, 10), minutes: 0, source: 'timer' })
    .returning('*');

  await emitEvent({ aggregateType: 'pm_time_entry', aggregateId: row.id, eventType: 'project.time_started', payload: { projectId: req.params.id } });
  res.status(201).json({ data: serializeEntry(row) });
}));

router.post('/timer/:entryId/stop', asyncHandler(async (req, res) => {
  await assertAccess(req.params.id, req.user.sub);
  const entry = await db('pm_time_entries').where({ id: req.params.entryId, project_id: req.params.id, user_id: req.user.sub, source: 'timer' }).first();
  if (!entry) throw new AppError('Running timer not found', 404);

  const startedAt = new Date(entry.created_at).getTime();
  const minutes = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
  const [updated] = await db('pm_time_entries').where({ id: entry.id }).update({ minutes }).returning('*');

  await emitEvent({ aggregateType: 'pm_time_entry', aggregateId: entry.id, eventType: 'project.time_stopped', payload: { projectId: req.params.id, minutes } });
  res.json({ data: serializeEntry(updated) });
}));

router.delete('/:entryId', asyncHandler(async (req, res) => {
  await assertAccess(req.params.id, req.user.sub);
  const entry = await db('pm_time_entries').where({ id: req.params.entryId, project_id: req.params.id }).first();
  if (!entry) throw new AppError('Time entry not found', 404);
  assertPermission(entry.user_id === req.user.sub, 'You can only delete your own time entries');
  await db('pm_time_entries').where({ id: entry.id }).del();
  res.status(204).end();
}));

export default router;
