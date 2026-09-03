// Domain 18 Phase B — Project Completion, Handover & Review (18.30). The
// checklist is computed live from real rows every time it's read — nothing
// here is a static/fake progress number — and /complete re-validates the
// exact same checks server-side before flipping the project to completed,
// so the button can never succeed against stale client state.
import { Router } from 'express';
import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { emitEvent } from '../../common/events/outbox.js';
import { loadProjectContext } from './shared.js';
import { canDeleteProject, assertPermission } from './permissions.js';

async function computeChecklist(projectId) {
  const [outstandingTasks, unresolvedIssues, overdueApprovals, unacceptedDeliverables, unapprovedMilestones, pendingTimesheets, pendingPaymentMilestones] = await Promise.all([
    db('pm_tasks').where({ project_id: projectId }).andWhere('status', '!=', 'done').count('id as c').first(),
    db('pm_risks').where({ project_id: projectId, kind: 'issue' }).andWhereNot('status', 'resolved').count('id as c').first(),
    db('pm_approvals').where({ project_id: projectId, status: 'pending' }).count('id as c').first(),
    db('pm_deliverables').where({ project_id: projectId }).andWhereNot('status', 'accepted').count('id as c').first(),
    db('pm_milestones').where({ project_id: projectId }).andWhereNotIn('status', ['approved', 'completed', 'cancelled']).count('id as c').first(),
    db('pm_timesheets').where({ project_id: projectId }).andWhereIn('status', ['open', 'submitted']).count('id as c').first(),
    db('pm_payment_milestones').where({ project_id: projectId }).andWhereNotIn('status', ['released', 'draft']).count('id as c').first(),
  ]);

  const checks = {
    outstandingTasks: Number(outstandingTasks?.c || 0),
    unresolvedIssues: Number(unresolvedIssues?.c || 0),
    overdueApprovals: Number(overdueApprovals?.c || 0),
    unacceptedDeliverables: Number(unacceptedDeliverables?.c || 0),
    unapprovedMilestones: Number(unapprovedMilestones?.c || 0),
    pendingTimesheets: Number(pendingTimesheets?.c || 0),
    pendingPaymentMilestones: Number(pendingPaymentMilestones?.c || 0),
  };
  const blockers = Object.entries(checks).filter(([, count]) => count > 0);
  return { checks, ready: blockers.length === 0, blockingReasons: blockers.map(([key]) => key) };
}

async function assertAccess(projectId, userId) {
  const { membership } = await loadProjectContext(projectId, userId);
  assertPermission(Boolean(membership), 'You do not have access to this project');
  return membership;
}

export const router = Router({ mergeParams: true });

router.get('/checklist', asyncHandler(async (req, res) => {
  await assertAccess(req.params.id, req.user.sub);
  const checklist = await computeChecklist(req.params.id);
  const existing = await db('pm_project_completions').where({ project_id: req.params.id }).first();
  res.json({ data: { ...checklist, status: existing?.status || 'in_progress', completedAt: existing?.completed_at || null } });
}));

router.post('/complete', asyncHandler(async (req, res) => {
  const membership = await assertAccess(req.params.id, req.user.sub);
  assertPermission(canDeleteProject(membership) || membership.role === 'manager', 'Only the project owner or manager can complete this project');

  return db.transaction(async (trx) => {
    const checklist = await computeChecklist(req.params.id);
    if (!checklist.ready) {
      throw new AppError('This project has outstanding items and cannot be marked complete yet', 422, { code: 'COMPLETION_BLOCKED', blockingReasons: checklist.blockingReasons });
    }

    await trx('pm_projects').where({ id: req.params.id }).update({ status: 'completed', actual_end_date: trx.raw('current_date'), progress_pct: 100, updated_by: req.user.sub });

    const [completion] = await trx('pm_project_completions')
      .insert({ project_id: req.params.id, status: 'completed', checklist_snapshot: JSON.stringify(checklist.checks), completed_by: req.user.sub, completed_at: trx.fn.now() })
      .onConflict('project_id')
      .merge({ status: 'completed', checklist_snapshot: JSON.stringify(checklist.checks), completed_by: req.user.sub, completed_at: trx.fn.now() })
      .returning('*');

    await emitEvent({ aggregateType: 'pm_project', aggregateId: req.params.id, eventType: 'project.completed', payload: {} }, trx);
    res.json({ data: { status: completion.status, completedAt: completion.completed_at } });
  });
}));

export default router;
