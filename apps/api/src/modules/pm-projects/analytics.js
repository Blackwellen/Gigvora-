// Domain 18 Phase B — Project Analytics (18.19) + AI delivery-risk surfacing.
// KPIs are computed live from real rows (no fabricated numbers). The
// delivery-risk card additionally calls the ML service with real features
// and persists an observability row (spec §40) — if the ML service is
// unavailable this returns risk: null rather than inventing a score.
import { createHash } from 'crypto';
import { Router } from 'express';
import { db } from '../../db/connection.js';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { loadProjectContext } from './shared.js';
import { assertPermission } from './permissions.js';
import { assessDeliveryRisk } from '../../common/ml/projectIntelligenceClient.js';

async function assertAccess(projectId, userId) {
  const { membership } = await loadProjectContext(projectId, userId);
  assertPermission(Boolean(membership), 'You do not have access to this project');
  return membership;
}

export const router = Router({ mergeParams: true });

router.get('/kpis', asyncHandler(async (req, res) => {
  await assertAccess(req.params.id, req.user.sub);
  const projectId = req.params.id;

  const [taskStats, milestoneStats, budget, expenseTotals, riskCounts, changeRequestCount, timeMinutes] = await Promise.all([
    db('pm_tasks').where({ project_id: projectId }).select(db.raw("count(*) as total, count(*) filter (where status='done') as done, count(*) filter (where status <> 'done' and due_date < current_date) as overdue")).first(),
    db('pm_milestones').where({ project_id: projectId }).select(db.raw("count(*) as total, count(*) filter (where status in ('approved','completed')) as approved")).first(),
    db('pm_project_budgets').where({ project_id: projectId }).first(),
    db('pm_expenses').where({ project_id: projectId }).select(db.raw("coalesce(sum(amount) filter (where status in ('approved','paid')), 0) as committed")).first(),
    db('pm_risks').where({ project_id: projectId, status: 'open' }).count('id as c').first(),
    db('pm_change_requests').where({ project_id: projectId }).count('id as c').first(),
    db('pm_time_entries').where({ project_id: projectId }).sum('minutes as total').first(),
  ]);

  const totalBudget = Number(budget?.total_budget || 0);
  const committed = Number(expenseTotals?.committed || 0);

  res.json({
    data: {
      taskCompletionPct: taskStats.total > 0 ? Number(((taskStats.done / taskStats.total) * 100).toFixed(1)) : 0,
      tasksOverdue: Number(taskStats.overdue || 0),
      milestoneCompletionPct: milestoneStats.total > 0 ? Number(((milestoneStats.approved / milestoneStats.total) * 100).toFixed(1)) : 0,
      budgetUsedPct: totalBudget > 0 ? Number(((committed / totalBudget) * 100).toFixed(1)) : 0,
      openRiskCount: Number(riskCounts?.c || 0),
      changeRequestCount: Number(changeRequestCount?.c || 0),
      totalTrackedHours: Number(((timeMinutes?.total || 0) / 60).toFixed(1)),
    },
  });
}));

router.get('/delivery-risk', asyncHandler(async (req, res) => {
  await assertAccess(req.params.id, req.user.sub);
  const projectId = req.params.id;

  const [openTasks, overdueTasks, nearestSlippedMilestone, unresolvedIssues, pendingApprovals, budget, expenseTotals, recentChanges] = await Promise.all([
    db('pm_tasks').where({ project_id: projectId }).andWhereNot('status', 'done').count('id as c').first(),
    db('pm_tasks').where({ project_id: projectId }).andWhereNot('status', 'done').andWhere('due_date', '<', db.raw('current_date')).count('id as c').first(),
    db('pm_milestones').where({ project_id: projectId }).andWhereNotIn('status', ['approved', 'completed', 'cancelled']).andWhere('target_date', '<', db.raw('current_date')).orderBy('target_date', 'asc').first(),
    db('pm_risks').where({ project_id: projectId, kind: 'issue' }).andWhereNot('status', 'resolved').count('id as c').first(),
    db('pm_approvals').where({ project_id: projectId, status: 'pending' }).count('id as c').first(),
    db('pm_project_budgets').where({ project_id: projectId }).first(),
    db('pm_expenses').where({ project_id: projectId }).select(db.raw("coalesce(sum(amount) filter (where status in ('approved','paid')), 0) as committed")).first(),
    db('pm_change_requests').where({ project_id: projectId }).andWhere('created_at', '>', db.raw("now() - interval '30 days'")).count('id as c').first(),
  ]);

  const totalOpen = Number(openTasks?.c || 0);
  const overdue = Number(overdueTasks?.c || 0);
  const totalBudget = Number(budget?.total_budget || 0);
  const committed = Number(expenseTotals?.committed || 0);
  const slippageDays = nearestSlippedMilestone
    ? Math.max(0, Math.floor((Date.now() - new Date(nearestSlippedMilestone.target_date).getTime()) / (24 * 3600 * 1000)))
    : 0;

  const features = {
    overdueTaskRatio: totalOpen > 0 ? overdue / totalOpen : 0,
    milestoneSlippageDays: slippageDays,
    unresolvedIssueCount: Number(unresolvedIssues?.c || 0),
    budgetVariancePct: totalBudget > 0 ? ((totalBudget - committed) / totalBudget) * 100 : 0,
    pendingApprovalCount: Number(pendingApprovals?.c || 0),
    scopeChangeCount30d: Number(recentChanges?.c || 0),
  };

  const inputHash = createHash('sha256').update(JSON.stringify(features)).digest('hex');
  const startedAt = Date.now();
  const result = await assessDeliveryRisk(projectId, features);
  const latencyMs = Date.now() - startedAt;

  if (!result) {
    res.json({ data: { available: false, features } });
    return;
  }

  await db('pm_ml_predictions').insert({
    project_id: projectId,
    prediction_type: 'delivery_risk',
    model_name: result.model_name,
    model_version: result.model_version,
    score: result.risk_score,
    band: result.risk_band,
    reason_codes: JSON.stringify(result.reason_codes),
    input_snapshot_hash: inputHash,
    latency_ms: latencyMs,
  });

  res.json({
    data: {
      available: true,
      riskScore: result.risk_score,
      riskBand: result.risk_band,
      scheduleRisk: result.schedule_risk,
      budgetRisk: result.budget_risk,
      scopeRisk: result.scope_risk,
      reasonCodes: result.reason_codes,
      modelName: result.model_name,
      modelVersion: result.model_version,
    },
  });
}));

export default router;
