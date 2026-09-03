// Domain 18 Phase B — Timesheets (18.15): a weekly approval unit aggregating
// pm_time_entries. Submitting snapshots the week's total minutes onto the
// pm_timesheets row (so an edit to a time entry after submission doesn't
// silently change an amount someone already approved) and locks the week —
// enforced by rejecting new manual entries for an already-submitted week.
import { Router } from 'express';
import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { emitEvent } from '../../common/events/outbox.js';
import { loadProjectContext } from './shared.js';
import { canEditProject, assertPermission } from './permissions.js';

function serializeTimesheet(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    userId: row.user_id,
    weekStart: row.week_start,
    status: row.status,
    totalMinutes: row.total_minutes,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
    reviewNote: row.review_note,
    createdAt: row.created_at,
  };
}

function startOfWeek(dateStr) {
  const d = new Date(dateStr);
  const day = d.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day; // Monday as week start
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

async function assertAccess(projectId, userId) {
  const { membership } = await loadProjectContext(projectId, userId);
  assertPermission(Boolean(membership), 'You do not have access to this project');
  return membership;
}

export const router = Router({ mergeParams: true });

router.get('/', asyncHandler(async (req, res) => {
  const membership = await assertAccess(req.params.id, req.user.sub);
  const query = db('pm_timesheets').where({ project_id: req.params.id });
  if (!canEditProject(membership) || req.query.mine === 'true') query.andWhere('user_id', req.user.sub);
  const rows = await query.orderBy('week_start', 'desc');
  res.json({ data: rows.map(serializeTimesheet) });
}));

router.post('/submit', asyncHandler(async (req, res) => {
  await assertAccess(req.params.id, req.user.sub);
  const { weekStart } = req.body;
  if (!weekStart) throw new AppError('weekStart is required', 422);
  const normalizedWeekStart = startOfWeek(weekStart);

  return db.transaction(async (trx) => {
    const weekEnd = new Date(normalizedWeekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);

    const totalRow = await trx('pm_time_entries')
      .where({ project_id: req.params.id, user_id: req.user.sub })
      .andWhere('occurred_on', '>=', normalizedWeekStart)
      .andWhere('occurred_on', '<=', weekEnd.toISOString().slice(0, 10))
      .sum('minutes as total')
      .first();
    const totalMinutes = Number(totalRow?.total || 0);
    if (totalMinutes === 0) throw new AppError('No tracked time found for that week', 422);

    const [timesheet] = await trx('pm_timesheets')
      .insert({ project_id: req.params.id, user_id: req.user.sub, week_start: normalizedWeekStart, status: 'submitted', total_minutes: totalMinutes, submitted_by: req.user.sub, submitted_at: trx.fn.now() })
      .onConflict(['project_id', 'user_id', 'week_start'])
      .merge({ status: 'submitted', total_minutes: totalMinutes, submitted_by: req.user.sub, submitted_at: trx.fn.now(), reviewed_at: null, reviewed_by: null, review_note: null })
      .returning('*');

    await emitEvent({ aggregateType: 'pm_timesheet', aggregateId: timesheet.id, eventType: 'project.timesheet_submitted', payload: { projectId: req.params.id, weekStart: normalizedWeekStart } }, trx);
    res.status(201).json({ data: serializeTimesheet(timesheet) });
  });
}));

router.patch('/:timesheetId', asyncHandler(async (req, res) => {
  const membership = await assertAccess(req.params.id, req.user.sub);
  assertPermission(canEditProject(membership), 'Only a project manager can review timesheets');

  const { status, reviewNote } = req.body;
  if (!['approved', 'rejected'].includes(status)) throw new AppError('status must be "approved" or "rejected"', 422);

  const existing = await db('pm_timesheets').where({ id: req.params.timesheetId, project_id: req.params.id }).first();
  if (!existing) throw new AppError('Timesheet not found', 404);
  if (existing.status !== 'submitted') throw new AppError('Only a submitted timesheet can be reviewed', 422);

  const [updated] = await db('pm_timesheets')
    .where({ id: req.params.timesheetId })
    .update({ status, reviewed_by: req.user.sub, reviewed_at: db.fn.now(), review_note: reviewNote || null })
    .returning('*');

  await emitEvent({ aggregateType: 'pm_timesheet', aggregateId: updated.id, eventType: 'project.timesheet_approved', payload: { projectId: req.params.id, status } });
  res.json({ data: serializeTimesheet(updated) });
}));

export default router;
