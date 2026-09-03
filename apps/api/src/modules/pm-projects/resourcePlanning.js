// Domain 18 Phase B — Resource Planning (18.26). Entirely derived from real
// rows (member weekly_capacity_hours, open task counts, and the last 7
// days of tracked time) — no fabricated utilization numbers. Reassignment
// suggestions require human action (moving a task's assigneeId via the
// existing Tasks endpoint) rather than an automatic mutation here, per
// spec's "human approval before reassignment".
import { Router } from 'express';
import { db } from '../../db/connection.js';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { loadProjectContext } from './shared.js';
import { assertPermission } from './permissions.js';

export const router = Router({ mergeParams: true });

router.get('/', asyncHandler(async (req, res) => {
  const { membership } = await loadProjectContext(req.params.id, req.user.sub);
  assertPermission(Boolean(membership), 'You do not have access to this project');

  const members = await db('pm_project_members as m')
    .join('users as u', 'u.id', 'm.user_id')
    .where({ 'm.project_id': req.params.id, 'm.invitation_status': 'accepted' })
    .select('m.id as member_id', 'm.user_id', 'm.weekly_capacity_hours', 'u.first_name', 'u.last_name');

  const userIds = members.map((m) => m.user_id);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);

  const [openTaskCounts, recentMinutes] = await Promise.all([
    userIds.length
      ? db('pm_tasks').where({ project_id: req.params.id }).whereIn('assignee_id', userIds).andWhereNot('status', 'done').select('assignee_id').count('id as count').groupBy('assignee_id')
      : [],
    userIds.length
      ? db('pm_time_entries').where({ project_id: req.params.id }).whereIn('user_id', userIds).andWhere('occurred_on', '>=', sevenDaysAgo).select('user_id').sum('minutes as minutes').groupBy('user_id')
      : [],
  ]);
  const openTasksByUser = new Map(openTaskCounts.map((r) => [r.assignee_id, Number(r.count)]));
  const trackedHoursByUser = new Map(recentMinutes.map((r) => [r.user_id, Number(r.minutes) / 60]));

  const unassignedOpenTasks = await db('pm_tasks').where({ project_id: req.params.id }).whereNull('assignee_id').andWhereNot('status', 'done').count('id as c').first();

  const rows = members.map((m) => {
    const trackedHours = trackedHoursByUser.get(m.user_id) || 0;
    const capacity = Number(m.weekly_capacity_hours);
    const utilizationPct = capacity > 0 ? Number(((trackedHours / capacity) * 100).toFixed(1)) : 0;
    return {
      memberId: m.member_id,
      userId: m.user_id,
      name: `${m.first_name} ${m.last_name}`.trim(),
      weeklyCapacityHours: capacity,
      trackedHoursLast7Days: Number(trackedHours.toFixed(1)),
      openTaskCount: openTasksByUser.get(m.user_id) || 0,
      utilizationPct,
      status: utilizationPct > 100 ? 'overallocated' : utilizationPct < 50 ? 'underallocated' : 'balanced',
    };
  });

  res.json({ data: { members: rows, unassignedOpenTaskCount: Number(unassignedOpenTasks?.c || 0) } });
}));

export default router;
