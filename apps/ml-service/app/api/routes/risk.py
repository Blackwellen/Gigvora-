from fastapi import APIRouter, Depends

from app.core.security import verify_api_key
from app.ml.models.registry import get_active_version, get_metrics
from app.ml.training.train_risk_model import MODEL_NAME as AUTH_MODEL_NAME
from app.ml.training.train_abuse_model import MODEL_NAME as ABUSE_MODEL_NAME
from app.schemas.risk import (
    AbuseAssessmentResponse,
    AbuseRequest,
    AuthenticationRiskRequest,
    RecoveryRiskRequest,
    RiskAssessmentResponse,
    SessionRiskRequest,
)
from app.services import abuse_service, risk_service

router = APIRouter(prefix="/api/v1", tags=["risk"], dependencies=[Depends(verify_api_key)])


@router.post("/risk/authentication", response_model=RiskAssessmentResponse)
def authentication_risk(payload: AuthenticationRiskRequest) -> RiskAssessmentResponse:
    return risk_service.assess_authentication_risk(payload)


@router.post("/risk/session", response_model=RiskAssessmentResponse)
def session_risk(payload: SessionRiskRequest) -> RiskAssessmentResponse:
    return risk_service.assess_session_risk(payload)


@router.post("/risk/recovery", response_model=RiskAssessmentResponse)
def recovery_risk(payload: RecoveryRiskRequest) -> RiskAssessmentResponse:
    return risk_service.assess_recovery_risk(payload)


@router.post("/abuse/signup", response_model=AbuseAssessmentResponse)
def signup_abuse(payload: AbuseRequest) -> AbuseAssessmentResponse:
    return AbuseAssessmentResponse(**abuse_service.assess_signup_abuse(payload))


@router.post("/abuse/signin", response_model=AbuseAssessmentResponse)
def signin_abuse(payload: AbuseRequest) -> AbuseAssessmentResponse:
    return AbuseAssessmentResponse(**abuse_service.assess_signin_abuse(payload))


@router.get("/models")
def list_models() -> dict:
    models = []
    for name in (AUTH_MODEL_NAME, ABUSE_MODEL_NAME):
        version = get_active_version(name)
        models.append({"name": name, "active_version": version, "status": "active" if version else "not_trained"})
    return {"models": models}


@router.get("/models/{name}/{version}")
def model_metrics(name: str, version: str) -> dict:
    metrics = get_metrics(name)
    if not metrics or metrics.get("model_version") != version:
        return {"found": False}
    return {"found": True, "metrics": metrics}
