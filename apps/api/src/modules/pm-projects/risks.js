// Domain 18 Phase B — Risks & Issues (18.27). One table (pm_risks), `kind`
// distinguishes a Risk (uncertain future event) from an Issue (existing
// problem) per spec's explicit semantic split — they share every other
// field, so a second table would just be duplicated schema.
import { Router } from 'express';
import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { emitEvent } from '../../common/events/outbox.js';
import { loadProjectContext } from './shared.js';
import { canManageTasks, canEditProject, assertPermission } from './permissions.js';

function serialize(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    kind: row.kind,
    title: row.title,
    description: row.description,
    category: row.category,
    probability: row.probability,
    impact: row.impact,
    severity: row.severity,
    ownerId: row.owner_id,
    mitigation: row.mitigation,
    status: row.status,
    dueDate: row.due_date,
    financialExposure: row.financial_exposure !== null ? Number(row.financial_exposure) : null,
    linkedTaskId: row.linked_task_id,
    linkedMilestoneId: row.linked_milestone_id,
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
  const query = db('pm_risks').where({ project_id: req.params.id });
  if (req.query.kind) query.andWhere('kind', req.query.kind);
  if (req.query.status) query.andWhere('status', req.query.status);
  const rows = await query.orderBy([{ column: 'severity', order: 'desc' }, { column: 'created_at', order: 'desc' }]);
  res.json({ data: rows.map(serialize) });
}));

router.post('/', asyncHandler(async (req, res) => {
  const membership = await assertAccess(req.params.id, req.user.sub);
  assertPermission(canManageTasks(membership), 'You do not have permission to log risks or issues');

  const { kind, title, description, category, probability, impact, severity = 'medium', ownerId, mitigation, dueDate, financialExposure, linkedTaskId, linkedMilestoneId } = req.body;
  if (!['risk', 'issue'].includes(kind)) throw new AppError('kind must be "risk" or "issue"', 422);
  if (!title?.trim()) throw new AppError('title is required', 422);

  const [row] = await db('pm_risks')
    .insert({
      project_id: req.params.id,
      kind,
      title: title.trim(),
      description: description || null,
      category: category || null,
      probability: probability || null,
      impact: impact || null,
      severity,
      owner_id: ownerId || null,
      mitigation: mitigation || null,
      due_date: dueDate || null,
      financial_exposure: financialExposure ?? null,
      linked_task_id: linkedTaskId || null,
      linked_milestone_id: linkedMilestoneId || null,
      created_by: req.user.sub,
    })
    .returning('*');

  await emitEvent({ aggregateType: 'pm_risk', aggregateId: row.id, eventType: kind === 'risk' ? 'project.risk_created' : 'project.issue_created', payload: { projectId: req.params.id, title: row.title } });
  res.status(201).json({ data: serialize(row) });
}));

router.patch('/:riskId', asyncHandler(async (req, res) => {
  const membership = await assertAccess(req.params.id, req.user.sub);
  assertPermission(canManageTasks(membership), 'You do not have permission to update this item');

  const existing = await db('pm_risks').where({ id: req.params.riskId, project_id: req.params.id }).first();
  if (!existing) throw new AppError('Risk/issue not found', 404);

  const update = {};
  for (const field of ['title', 'description', 'category', 'probability', 'impact', 'severity', 'ownerId', 'mitigation', 'status', 'dueDate', 'financialExposure']) {
    if (field in req.body) {
      const column = field.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
      update[column] = req.body[field];
    }
  }
  if (Object.keys(update).length === 0) throw new AppError('No editable fields provided', 422);

  const [updated] = await db('pm_risks').where({ id: req.params.riskId }).update(update).returning('*');
  res.json({ data: serialize(updated) });
}));

router.delete('/:riskId', asyncHandler(async (req, res) => {
  const membership = await assertAccess(req.params.id, req.user.sub);
  assertPermission(canEditProject(membership), 'You do not have permission to delete this item');
  const deleted = await db('pm_risks').where({ id: req.params.riskId, project_id: req.params.id }).del();
  if (!deleted) throw new AppError('Risk/issue not found', 404);
  res.status(204).end();
}));

export default router;
