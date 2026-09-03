from fastapi import APIRouter, Depends

from app.core.security import verify_api_key
from app.schemas.project_intelligence import (
    DeliveryRiskRequest,
    DeliveryRiskResponse,
    TaskPrioritisationRequest,
    TaskPrioritisationResponse,
)
from app.services import project_intelligence_service

router = APIRouter(prefix="/api/v1/project-intelligence", tags=["project-intelligence"], dependencies=[Depends(verify_api_key)])


@router.post("/delivery-risk", response_model=DeliveryRiskResponse)
def delivery_risk(payload: DeliveryRiskRequest) -> DeliveryRiskResponse:
    return project_intelligence_service.assess_delivery_risk(payload)


@router.post("/task-priority", response_model=TaskPrioritisationResponse)
def task_priority(payload: TaskPrioritisationRequest) -> TaskPrioritisationResponse:
    scores = project_intelligence_service.prioritise_tasks(payload)
    return TaskPrioritisationResponse(
        project_id=payload.project_id,
        model_name=project_intelligence_service.TASK_MODEL_NAME,
        model_version=project_intelligence_service.TASK_MODEL_VERSION,
        scores=scores,
    )
