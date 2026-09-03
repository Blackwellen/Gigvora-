import { config } from '../../config/index.js';

const TIMEOUT_MS = 800;

async function callMl(path, body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${config.mlService.url}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.mlService.apiKey}` },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null; // ML service unavailable — callers must degrade to "no score" rather than fabricate one.
  } finally {
    clearTimeout(timeout);
  }
}

/** Returns null (never throws) if the ML service is unavailable — callers must render a
 * "risk analysis unavailable" state rather than fabricate a score. */
export async function assessDeliveryRisk(projectId, features) {
  return callMl('/api/v1/project-intelligence/delivery-risk', {
    project_id: projectId,
    overdue_task_ratio: features.overdueTaskRatio,
    milestone_slippage_days: features.milestoneSlippageDays,
    unresolved_issue_count: features.unresolvedIssueCount,
    budget_variance_pct: features.budgetVariancePct,
    pending_approval_count: features.pendingApprovalCount,
    scope_change_count_30d: features.scopeChangeCount30d || 0,
  });
}

export async function prioritiseTasks(projectId, taskFeatures) {
  const result = await callMl('/api/v1/project-intelligence/task-priority', {
    project_id: projectId,
    tasks: taskFeatures.map((t) => ({
      task_id: t.taskId,
      days_until_due: t.daysUntilDue,
      is_overdue: t.isOverdue,
      priority_weight: t.priorityWeight,
      blocked_dependent_count: t.blockedDependentCount || 0,
      assignee_open_task_count: t.assigneeOpenTaskCount || 0,
    })),
  });
  return result?.scores || null;
}
