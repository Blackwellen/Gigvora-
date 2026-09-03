"""Domain 18 — Projects, Workspaces, Tasks & Delivery: request/response
shapes for delivery-risk scoring and task prioritisation. No project content
(names, descriptions) crosses this boundary — only small numeric/count
features apps/api has already computed from its own authorized data, per the
"don't store unnecessary sensitive raw feature payloads" ML-observability
requirement.
"""

from pydantic import BaseModel, Field


class DeliveryRiskRequest(BaseModel):
    project_id: str
    overdue_task_ratio: float = Field(ge=0, le=1, description="overdue open tasks / total open tasks")
    milestone_slippage_days: float = Field(ge=0, description="days the nearest unapproved milestone is past its target date, 0 if none")
    unresolved_issue_count: int = Field(ge=0)
    budget_variance_pct: float = Field(description="(planned - committed) / planned * 100; negative means over budget")
    pending_approval_count: int = Field(ge=0)
    scope_change_count_30d: int = Field(ge=0, default=0)


class DeliveryRiskResponse(BaseModel):
    model_config = {"protected_namespaces": ()}

    project_id: str
    risk_score: float = Field(ge=0, le=100)
    risk_band: str
    model_name: str
    model_version: str
    reason_codes: list[str]
    schedule_risk: str
    budget_risk: str
    scope_risk: str


class TaskFeature(BaseModel):
    task_id: str
    days_until_due: float | None = None
    is_overdue: bool = False
    priority_weight: int = Field(ge=0, le=3, description="0=urgent .. 3=low")
    blocked_dependent_count: int = Field(ge=0, default=0)
    assignee_open_task_count: int = Field(ge=0, default=0)


class TaskPrioritisationRequest(BaseModel):
    project_id: str
    tasks: list[TaskFeature]


class TaskPriorityScore(BaseModel):
    task_id: str
    score: float = Field(ge=0, le=100)
    reason_codes: list[str]


class TaskPrioritisationResponse(BaseModel):
    model_config = {"protected_namespaces": ()}

    project_id: str
    model_name: str
    model_version: str
    scores: list[TaskPriorityScore]
