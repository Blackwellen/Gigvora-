// Domain 18 Phase B — Project Settings (18.29). General-info editing reuses
// projects.service.updateProject (already exposed at PATCH /pm-projects/:id)
// — this module only adds the Danger Zone actions that need their own
// invariants: transfer ownership (exactly one owner at a time) and archive.
// Delete already exists via DELETE /pm-projects/:id (owner-only).
import { Router } from 'express';
import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { emitEvent } from '../../common/events/outbox.js';
import { loadProjectContext } from './shared.js';
import { canDeleteProject, canEditProject, assertPermission } from './permissions.js';

export const router = Router({ mergeParams: true });

router.post('/archive', asyncHandler(async (req, res) => {
  const { membership } = await loadProjectContext(req.params.id, req.user.sub);
  assertPermission(canEditProject(membership), 'You do not have permission to archive this project');

  const [updated] = await db('pm_projects').where({ id: req.params.id }).update({ status: 'archived', updated_by: req.user.sub }).returning('*');
  await emitEvent({ aggregateType: 'pm_project', aggregateId: req.params.id, eventType: 'project.archived', payload: {} });
  res.json({ data: { id: updated.id, status: updated.status } });
}));

router.post('/transfer-ownership', asyncHandler(async (req, res) => {
  return db.transaction(async (trx) => {
    const { membership } = await loadProjectContext(req.params.id, req.user.sub, trx);
    assertPermission(canDeleteProject(membership), 'Only the current owner can transfer ownership');

    const { newOwnerMemberId } = req.body;
    const newOwnerMembership = await trx('pm_project_members').where({ id: newOwnerMemberId, project_id: req.params.id }).first();
    if (!newOwnerMembership) throw new AppError('That member was not found on this project', 404);
    if (newOwnerMembership.invitation_status !== 'accepted') throw new AppError('The new owner must already be an active member', 422);

    await trx('pm_project_members').where({ id: membership.id }).update({ role: 'manager' });
    await trx('pm_project_members').where({ id: newOwnerMembership.id }).update({ role: 'owner' });
    await trx('pm_projects').where({ id: req.params.id }).update({ owner_id: newOwnerMembership.user_id, updated_by: req.user.sub });

    await emitEvent({ aggregateType: 'pm_project', aggregateId: req.params.id, eventType: 'project.ownership_transferred', payload: { fromUserId: req.user.sub, toUserId: newOwnerMembership.user_id } }, trx);
    res.json({ data: { newOwnerUserId: newOwnerMembership.user_id } });
  });
}));

export default router;
