"""Domain 18 delivery-risk and task-prioritisation scoring.

Deterministic, rules-based, and fully explained (reason_codes) — matching
the same pattern as risk_service.py's rules layer for auth/session risk.
This is intentionally NOT presented as a trained ML model: there is no
labelled "project actually slipped" outcome dataset to train against yet, and
shipping a fake confidence number from an untrained model would violate the
"no placeholder ML percentages" requirement. model_version is a real,
versioned artifact identifier (bump it whenever the formula changes) so
downstream ML-observability logging (apps/api) still has something concrete
to record per spec §40, even though "model" here means "versioned scoring
formula" rather than a fitted estimator.
"""

from app.schemas.project_intelligence import (
    DeliveryRiskRequest,
    DeliveryRiskResponse,
    TaskPrioritisationRequest,
    TaskPriorityScore,
)

RULE_MODEL_NAME = "pm-delivery-risk-rules"
RULE_MODEL_VERSION = "v1"

TASK_MODEL_NAME = "pm-task-priority-rules"
TASK_MODEL_VERSION = "v1"


def _band(score: float) -> str:
    if score >= 70:
        return "high"
    if score >= 40:
        return "medium"
    return "low"


def assess_delivery_risk(payload: DeliveryRiskRequest) -> DeliveryRiskResponse:
    score = 0.0
    reasons: list[str] = []

    schedule_component = 0.0
    if payload.overdue_task_ratio > 0.3:
        schedule_component += 35
        reasons.append("high_overdue_task_ratio")
    elif payload.overdue_task_ratio > 0.1:
        schedule_component += 15
        reasons.append("elevated_overdue_task_ratio")

    if payload.milestone_slippage_days > 14:
        schedule_component += 30
        reasons.append("milestone_significantly_late")
    elif payload.milestone_slippage_days > 3:
        schedule_component += 15
        reasons.append("milestone_slipping")

    budget_component = 0.0
    if payload.budget_variance_pct < -15:
        budget_component += 30
        reasons.append("significant_budget_overrun")
    elif payload.budget_variance_pct < -5:
        budget_component += 15
        reasons.append("budget_trending_over")

    scope_component = 0.0
    if payload.unresolved_issue_count >= 5:
        scope_component += 20
        reasons.append("many_unresolved_issues")
    elif payload.unresolved_issue_count >= 2:
        scope_component += 10
        reasons.append("some_unresolved_issues")

    if payload.pending_approval_count >= 3:
        scope_component += 10
        reasons.append("approvals_backing_up")

    if payload.scope_change_count_30d >= 3:
        scope_component += 15
        reasons.append("frequent_recent_scope_changes")

    score = min(100.0, schedule_component + budget_component + scope_component)

    return DeliveryRiskResponse(
        project_id=payload.project_id,
        risk_score=round(score, 1),
        risk_band=_band(score),
        model_name=RULE_MODEL_NAME,
        model_version=RULE_MODEL_VERSION,
        reason_codes=reasons,
        schedule_risk=_band(schedule_component),
        budget_risk=_band(budget_component),
        scope_risk=_band(scope_component),
    )


def prioritise_tasks(payload: TaskPrioritisationRequest) -> list[TaskPriorityScore]:
    results = []
    for task in payload.tasks:
        score = 0.0
        reasons: list[str] = []

        if task.is_overdue:
            score += 40
            reasons.append("overdue")
        elif task.days_until_due is not None and task.days_until_due <= 2:
            score += 25
            reasons.append("due_soon")

        priority_points = [30, 20, 10, 0][min(task.priority_weight, 3)]
        score += priority_points
        if task.priority_weight == 0:
            reasons.append("urgent_priority")

        if task.blocked_dependent_count > 0:
            score += min(20, task.blocked_dependent_count * 10)
            reasons.append("blocks_other_tasks")

        if task.assignee_open_task_count >= 8:
            score -= 10
            reasons.append("assignee_overloaded")

        results.append(TaskPriorityScore(task_id=task.task_id, score=round(max(0.0, min(100.0, score)), 1), reason_codes=reasons))

    return sorted(results, key=lambda r: r.score, reverse=True)
