// Domain 18 Phase B — Change Requests (18.18): formal scope-change control.
// Approving a change request only flips its own status here — it does NOT
// automatically rewrite budget/timeline/tasks, matching spec §21's "only
// after explicit approval" rule; wiring an approved CR's impact fields back
// into the project's budget/schedule is a deliberate, separate action left
// for whoever actions the change, not an automatic side effect of approval.
import { Router } from 'express';
import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { emitEvent } from '../../common/events/outbox.js';
import { loadProjectContext } from './shared.js';
import { canEditProject, canManageTasks, assertPermission } from './permissions.js';

const VALID_TRANSITIONS = {
  draft: ['submitted', 'cancelled'],
  submitted: ['under_review', 'cancelled'],
  under_review: ['needs_information', 'approved', 'rejected'],
  needs_information: ['under_review', 'cancelled'],
  approved: ['implemented'],
  rejected: [],
  implemented: [],
  cancelled: [],
};

function serialize(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description,
    reason: row.reason,
    scopeImpact: row.scope_impact,
    dateImpactDays: row.date_impact_days,
    costImpact: row.cost_impact !== null ? Number(row.cost_impact) : null,
    status: row.status,
    requestedBy: row.requested_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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
  const rows = await db('pm_change_requests').where({ project_id: req.params.id }).orderBy('created_at', 'desc');
  res.json({ data: rows.map(serialize) });
}));

router.post('/', asyncHandler(async (req, res) => {
  const membership = await assertAccess(req.params.id, req.user.sub);
  assertPermission(canManageTasks(membership), 'You do not have permission to request a change');

  const { title, description, reason, scopeImpact, dateImpactDays, costImpact } = req.body;
  if (!title?.trim() || !description?.trim()) throw new AppError('title and description are required', 422);

  const [row] = await db('pm_change_requests')
    .insert({ project_id: req.params.id, title: title.trim(), description: description.trim(), reason: reason || null, scope_impact: scopeImpact || null, date_impact_days: dateImpactDays ?? null, cost_impact: costImpact ?? null, requested_by: req.user.sub })
    .returning('*');

  await emitEvent({ aggregateType: 'pm_change_request', aggregateId: row.id, eventType: 'project.change_request_created', payload: { projectId: req.params.id, title: row.title } });
  res.status(201).json({ data: serialize(row) });
}));

router.patch('/:changeRequestId', asyncHandler(async (req, res) => {
  const membership = await assertAccess(req.params.id, req.user.sub);
  const existing = await db('pm_change_requests').where({ id: req.params.changeRequestId, project_id: req.params.id }).first();
  if (!existing) throw new AppError('Change request not found', 404);

  if (req.body.status) {
    assertPermission(canEditProject(membership), 'Only a project manager can change the status of a change request');
    const allowed = VALID_TRANSITIONS[existing.status] || [];
    if (!allowed.includes(req.body.status)) {
      throw new AppError(`Cannot move a change request from "${existing.status}" to "${req.body.status}"`, 422, { code: 'INVALID_TRANSITION', allowed });
    }
  } else {
    assertPermission(existing.requested_by === req.user.sub && existing.status === 'draft', 'Only the requester can edit a draft change request');
  }

  const update = {};
  for (const field of ['title', 'description', 'reason', 'scopeImpact', 'dateImpactDays', 'costImpact', 'status']) {
    if (field in req.body) {
      const column = field.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
      update[column] = req.body[field];
    }
  }

  const [updated] = await db('pm_change_requests').where({ id: req.params.changeRequestId }).update(update).returning('*');
  if (req.body.status) {
    const eventType = req.body.status === 'approved' ? 'project.change_request_approved' : 'project.change_request_updated';
    await emitEvent({ aggregateType: 'pm_change_request', aggregateId: updated.id, eventType, payload: { projectId: req.params.id, status: req.body.status } });
  }
  res.json({ data: serialize(updated) });
}));

export default router;
