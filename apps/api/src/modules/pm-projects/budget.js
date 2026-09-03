// Domain 18 Phase B — Budget (18.16): total budget + planned line items +
// actual expenses, with derived (not stored) burn/variance/forecast figures
// computed on every read from real rows — never a fabricated percentage.
import { Router } from 'express';
import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { emitEvent } from '../../common/events/outbox.js';
import { loadProjectContext } from './shared.js';
import { canEditProject, canManageTasks, assertPermission } from './permissions.js';

async function assertAccess(projectId, userId) {
  const { membership } = await loadProjectContext(projectId, userId);
  assertPermission(Boolean(membership), 'You do not have access to this project');
  return membership;
}

export const router = Router({ mergeParams: true });

router.get('/', asyncHandler(async (req, res) => {
  await assertAccess(req.params.id, req.user.sub);
  const projectId = req.params.id;

  const [budget, lines, expenseTotals, timeEntryMinutes] = await Promise.all([
    db('pm_project_budgets').where({ project_id: projectId }).first(),
    db('pm_budget_lines').where({ project_id: projectId }).orderBy('created_at', 'asc'),
    db('pm_expenses')
      .where({ project_id: projectId })
      .select(db.raw("coalesce(sum(amount) filter (where status in ('approved','paid')), 0) as committed, coalesce(sum(amount) filter (where status = 'paid'), 0) as paid"))
      .first(),
    db('pm_time_entries').where({ project_id: projectId, billable: true }).sum('minutes as total').first(),
  ]);

  const totalBudget = Number(budget?.total_budget || 0);
  const committed = Number(expenseTotals?.committed || 0);
  const paid = Number(expenseTotals?.paid || 0);
  const plannedFromLines = lines.reduce((sum, l) => sum + Number(l.planned_amount), 0);
  const remaining = totalBudget - committed;
  const variance = totalBudget - plannedFromLines;

  res.json({
    data: {
      projectId,
      totalBudget,
      currency: budget?.currency || 'USD',
      contingencyPct: Number(budget?.contingency_pct || 0),
      plannedFromLines,
      committed,
      paid,
      remaining,
      variancePct: totalBudget > 0 ? Number(((variance / totalBudget) * 100).toFixed(1)) : 0,
      billableHours: Number(((timeEntryMinutes?.total || 0) / 60).toFixed(1)),
      lines: lines.map((l) => ({ id: l.id, category: l.category, kind: l.kind, plannedAmount: Number(l.planned_amount), milestoneId: l.milestone_id })),
    },
  });
}));

router.put('/', asyncHandler(async (req, res) => {
  const membership = await assertAccess(req.params.id, req.user.sub);
  assertPermission(canEditProject(membership), 'You do not have permission to manage the budget');
  const { totalBudget, contingencyPct = 0, currency = 'USD' } = req.body;
  if (!Number.isFinite(Number(totalBudget)) || Number(totalBudget) < 0) throw new AppError('totalBudget must be a non-negative number', 422);

  const [row] = await db('pm_project_budgets')
    .insert({ project_id: req.params.id, total_budget: totalBudget, contingency_pct: contingencyPct, currency })
    .onConflict('project_id')
    .merge({ total_budget: totalBudget, contingency_pct: contingencyPct, currency })
    .returning('*');

  await emitEvent({ aggregateType: 'pm_project_budget', aggregateId: row.id, eventType: 'project.budget_changed', payload: { projectId: req.params.id, totalBudget } });
  res.json({ data: { totalBudget: Number(row.total_budget), contingencyPct: Number(row.contingency_pct), currency: row.currency } });
}));

router.post('/lines', asyncHandler(async (req, res) => {
  const membership = await assertAccess(req.params.id, req.user.sub);
  assertPermission(canEditProject(membership), 'You do not have permission to manage the budget');
  const { category, kind = 'expense', plannedAmount, milestoneId } = req.body;
  if (!category?.trim() || !Number.isFinite(Number(plannedAmount))) throw new AppError('category and plannedAmount are required', 422);

  const [row] = await db('pm_budget_lines').insert({ project_id: req.params.id, category: category.trim(), kind, planned_amount: plannedAmount, milestone_id: milestoneId || null }).returning('*');
  res.status(201).json({ data: { id: row.id, category: row.category, kind: row.kind, plannedAmount: Number(row.planned_amount), milestoneId: row.milestone_id } });
}));

router.get('/expenses', asyncHandler(async (req, res) => {
  await assertAccess(req.params.id, req.user.sub);
  const rows = await db('pm_expenses').where({ project_id: req.params.id }).orderBy('incurred_on', 'desc');
  res.json({
    data: rows.map((r) => ({ id: r.id, description: r.description, amount: Number(r.amount), status: r.status, incurredOn: r.incurred_on, submittedBy: r.submitted_by, budgetLineId: r.budget_line_id })),
  });
}));

router.post('/expenses', asyncHandler(async (req, res) => {
  const membership = await assertAccess(req.params.id, req.user.sub);
  assertPermission(canManageTasks(membership), 'You do not have permission to submit expenses');
  const { description, amount, incurredOn, budgetLineId } = req.body;
  if (!description?.trim() || !Number.isFinite(Number(amount)) || !incurredOn) throw new AppError('description, amount, and incurredOn are required', 422);

  const [row] = await db('pm_expenses')
    .insert({ project_id: req.params.id, description: description.trim(), amount, incurred_on: incurredOn, budget_line_id: budgetLineId || null, submitted_by: req.user.sub })
    .returning('*');
  res.status(201).json({ data: { id: row.id, description: row.description, amount: Number(row.amount), status: row.status, incurredOn: row.incurred_on } });
}));

router.patch('/expenses/:expenseId', asyncHandler(async (req, res) => {
  const membership = await assertAccess(req.params.id, req.user.sub);
  assertPermission(canEditProject(membership), 'Only a project manager can approve expenses');
  const { status } = req.body;
  if (!['approved', 'paid', 'rejected'].includes(status)) throw new AppError('Invalid status', 422);

  const [updated] = await db('pm_expenses').where({ id: req.params.expenseId, project_id: req.params.id }).update({ status }).returning('*');
  if (!updated) throw new AppError('Expense not found', 404);
  res.json({ data: { id: updated.id, status: updated.status, amount: Number(updated.amount) } });
}));

export default router;
