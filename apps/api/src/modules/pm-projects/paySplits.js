// Domain 18 Phase B — Pay Split (part of 18.25 Members & Roles): revenue/
// compensation sharing across collaborating project members. Percentage
// splits are validated so the total across a project never exceeds 100% —
// the one hard money-safety invariant this resource has to hold (spec §25's
// "total allocation cannot exceed available distributable amount").
import { Router } from 'express';
import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { emitEvent } from '../../common/events/outbox.js';
import { loadProjectContext } from './shared.js';
import { canEditProject, assertPermission } from './permissions.js';
import { validatePercentageTotal } from './payValidation.js';

export { validatePercentageTotal };

export function serializePaySplit(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    memberId: row.member_id,
    allocationType: row.allocation_type,
    percentage: row.percentage !== null ? Number(row.percentage) : null,
    fixedAmount: row.fixed_amount !== null ? Number(row.fixed_amount) : null,
    milestoneId: row.milestone_id,
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
  const rows = await db('pm_project_pay_splits').where({ project_id: req.params.id }).orderBy('created_at', 'asc');
  res.json({ data: rows.map(serializePaySplit) });
}));

router.post('/', asyncHandler(async (req, res) => {
  return db.transaction(async (trx) => {
    const { membership } = await loadProjectContext(req.params.id, req.user.sub, trx);
    assertPermission(canEditProject(membership), 'You do not have permission to manage pay splits');

    const { memberId, allocationType = 'percentage', percentage, fixedAmount, milestoneId } = req.body;
    const member = await trx('pm_project_members').where({ id: memberId, project_id: req.params.id }).first();
    if (!member) throw new AppError('Member not found on this project', 404);

    if (allocationType === 'percentage') {
      if (!Number.isFinite(Number(percentage)) || Number(percentage) <= 0) throw new AppError('percentage must be a positive number', 422);
      const existing = await trx('pm_project_pay_splits').where({ project_id: req.params.id });
      const { valid, total } = validatePercentageTotal(existing, { newPercentage: percentage });
      if (!valid) throw new AppError(`Total pay-split percentage would be ${total}%, which exceeds 100%`, 422, { code: 'PAY_SPLIT_OVER_ALLOCATED', total });
    } else if (allocationType === 'fixed') {
      if (!Number.isFinite(Number(fixedAmount)) || Number(fixedAmount) <= 0) throw new AppError('fixedAmount must be a positive number', 422);
    }

    const [row] = await trx('pm_project_pay_splits')
      .insert({ project_id: req.params.id, member_id: memberId, allocation_type: allocationType, percentage: allocationType === 'percentage' ? percentage : null, fixed_amount: allocationType === 'fixed' ? fixedAmount : null, milestone_id: milestoneId || null })
      .returning('*');

    await emitEvent({ aggregateType: 'pm_project', aggregateId: req.params.id, eventType: 'project.pay_split_changed', payload: { memberId, allocationType } }, trx);
    res.status(201).json({ data: serializePaySplit(row) });
  });
}));

router.delete('/:paySplitId', asyncHandler(async (req, res) => {
  const membership = await assertAccess(req.params.id, req.user.sub);
  assertPermission(canEditProject(membership), 'You do not have permission to manage pay splits');
  const deleted = await db('pm_project_pay_splits').where({ id: req.params.paySplitId, project_id: req.params.id }).del();
  if (!deleted) throw new AppError('Pay split not found', 404);
  await emitEvent({ aggregateType: 'pm_project', aggregateId: req.params.id, eventType: 'project.pay_split_changed', payload: { removed: req.params.paySplitId } });
  res.status(204).end();
}));

export default router;
