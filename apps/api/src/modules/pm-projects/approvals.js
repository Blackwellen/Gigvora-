// Domain 18 Phase B — Approvals (18.17): a generic workflow any object type
// (deliverable, milestone, file, change request, payment release, timesheet,
// project completion) can request. Phase B implements 'single' and
// 'sequential' modes fully (parallel/quorum accept the same schema — see
// pm_approvals.mode — but the decision-aggregation logic for them is left
// for a later pass rather than shipped half-correct).
import { Router } from 'express';
import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { emitEvent } from '../../common/events/outbox.js';
import { loadProjectContext } from './shared.js';
import { canEditProject, assertPermission } from './permissions.js';

function serializeApproval(row, steps = []) {
  return {
    id: row.id,
    projectId: row.project_id,
    objectType: row.object_type,
    objectId: row.object_id,
    mode: row.mode,
    status: row.status,
    requestedBy: row.requested_by,
    createdAt: row.created_at,
    steps: steps.map((s) => ({ id: s.id, approverId: s.approver_id, stepOrder: s.step_order, decision: s.decision, comment: s.comment, decidedAt: s.decided_at })),
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
  const query = db('pm_approvals').where({ project_id: req.params.id });
  if (req.query.status) query.andWhere('status', req.query.status);
  const approvals = await query.orderBy('created_at', 'desc');
  const ids = approvals.map((a) => a.id);
  const steps = ids.length ? await db('pm_approval_steps').whereIn('approval_id', ids).orderBy('step_order', 'asc') : [];
  const stepsByApproval = new Map();
  for (const s of steps) {
    if (!stepsByApproval.has(s.approval_id)) stepsByApproval.set(s.approval_id, []);
    stepsByApproval.get(s.approval_id).push(s);
  }
  res.json({ data: approvals.map((a) => serializeApproval(a, stepsByApproval.get(a.id) || [])) });
}));

router.post('/', asyncHandler(async (req, res) => {
  const membership = await assertAccess(req.params.id, req.user.sub);
  assertPermission(canEditProject(membership), 'You do not have permission to request approvals');

  const { objectType, objectId, mode = 'single', approverIds = [] } = req.body;
  if (!objectType || !objectId) throw new AppError('objectType and objectId are required', 422);
  if (approverIds.length === 0) throw new AppError('At least one approver is required', 422);

  return db.transaction(async (trx) => {
    const [approval] = await trx('pm_approvals')
      .insert({ project_id: req.params.id, object_type: objectType, object_id: objectId, mode, quorum_count: mode === 'quorum' ? req.body.quorumCount || 1 : null, requested_by: req.user.sub })
      .returning('*');

    const steps = await trx('pm_approval_steps')
      .insert(approverIds.map((approverId, i) => ({ approval_id: approval.id, approver_id: approverId, step_order: i })))
      .returning('*');

    await emitEvent({ aggregateType: 'pm_approval', aggregateId: approval.id, eventType: 'project.approval_requested', payload: { projectId: req.params.id, objectType, objectId } }, trx);
    res.status(201).json({ data: serializeApproval(approval, steps) });
  });
}));

router.post('/:approvalId/decide', asyncHandler(async (req, res) => {
  await assertAccess(req.params.id, req.user.sub);
  const { decision, comment } = req.body;
  if (!['approved', 'rejected'].includes(decision)) throw new AppError('decision must be "approved" or "rejected"', 422);

  return db.transaction(async (trx) => {
    const approval = await trx('pm_approvals').where({ id: req.params.approvalId, project_id: req.params.id }).forUpdate().first();
    if (!approval) throw new AppError('Approval not found', 404);
    if (approval.status !== 'pending') throw new AppError('This approval has already been decided', 409);

    const steps = await trx('pm_approval_steps').where({ approval_id: approval.id }).orderBy('step_order', 'asc');
    const myStep = steps.find((s) => s.approver_id === req.user.sub && s.decision === 'pending');
    if (!myStep) throw new AppError('You are not a pending approver on this request, or have already decided', 403);

    // Sequential mode only allows the earliest pending step to act; single
    // mode has exactly one step so this is a no-op guard for it.
    if (approval.mode === 'sequential') {
      const earliestPending = steps.find((s) => s.decision === 'pending');
      assertPermission(earliestPending.id === myStep.id, 'It is not your turn to approve this request yet');
    }

    await trx('pm_approval_steps').where({ id: myStep.id }).update({ decision, comment: comment || null, decided_at: trx.fn.now() });

    const refreshedSteps = await trx('pm_approval_steps').where({ approval_id: approval.id }).orderBy('step_order', 'asc');
    let finalStatus = null;
    if (decision === 'rejected' && approval.mode !== 'parallel') finalStatus = 'rejected';
    else if (refreshedSteps.every((s) => s.decision === 'approved')) finalStatus = 'approved';
    else if (refreshedSteps.some((s) => s.decision === 'rejected') && refreshedSteps.every((s) => s.decision !== 'pending')) finalStatus = 'rejected';

    let updatedApproval = approval;
    if (finalStatus) {
      [updatedApproval] = await trx('pm_approvals').where({ id: approval.id }).update({ status: finalStatus }).returning('*');
      await emitEvent(
        { aggregateType: 'pm_approval', aggregateId: approval.id, eventType: finalStatus === 'approved' ? 'project.approval_approved' : 'project.approval_rejected', payload: { projectId: req.params.id, objectType: approval.object_type, objectId: approval.object_id } },
        trx
      );
    }

    res.json({ data: serializeApproval(updatedApproval, refreshedSteps) });
  });
}));

export default router;
