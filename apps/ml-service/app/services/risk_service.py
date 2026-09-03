"""Model A: authentication / session / recovery risk scoring.

Two layers, per the domain spec:
  1. Deterministic security rules — cheap, auditable, always available.
  2. Statistical model (HistGradientBoostingClassifier) — nuanced scoring on top.

This module ONLY produces a risk signal. It never decides ALLOW/BLOCK/STEP_UP — that
decision belongs to the policy engine on the API side (common/security/policy.js), which is
the sole place a request can be denied. If the trained artifact is missing (fresh checkout,
not yet trained) this degrades to rules-only scoring rather than failing the request.
"""

from app.ml.models.registry import get_active_version, load_model
from app.ml.pipelines.features import AUTHENTICATION_FEATURES, FEATURE_SCHEMA_VERSION
from app.ml.training.train_risk_model import MODEL_NAME as AUTH_MODEL_NAME
from app.schemas.risk import AuthenticationRiskRequest, RecoveryRiskRequest, RiskAssessmentResponse, SessionRiskRequest

RULE_MODEL_NAME = "deterministic-rules"
RULE_MODEL_VERSION = "v1"


def _band(score: float) -> str:
    if score >= 80:
        return "critical"
    if score >= 55:
        return "high"
    if score >= 25:
        return "medium"
    return "low"


def _rule_score(payload: AuthenticationRiskRequest) -> tuple[float, list[str]]:
    score = 0.0
    reasons: list[str] = []

    if payload.failed_signins_5m >= 5:
        score += 45
        reasons.append("failed_attempt_burst")
    elif payload.failed_signins_1h >= 8:
        score += 30
        reasons.append("elevated_failed_attempts")

    if payload.impossible_travel_score > 0.5:
        score += 35
        reasons.append("impossible_travel")

    if not payload.known_device:
        score += 15
        reasons.append("new_device")

    if not payload.ip_seen_before:
        score += 10
        reasons.append("new_network")

    if not payload.country_seen_before:
        score += 12
        reasons.append("new_location")

    if payload.login_hour_deviation > 6:
        score += 8
        reasons.append("unusual_sign_in_time")

    if payload.trusted_device:
        score = max(0, score - 15)
        reasons.append("trusted_device")

    if payload.mfa_enabled:
        score = max(0, score - 5)

    return min(score, 100), reasons


def assess_authentication_risk(payload: AuthenticationRiskRequest) -> RiskAssessmentResponse:
    rule_score, reasons = _rule_score(payload)
    model = load_model(AUTH_MODEL_NAME)

    if model is None:
        return RiskAssessmentResponse(
            risk_probability=round(rule_score / 100, 4),
            risk_score=round(rule_score, 2),
            risk_band=_band(rule_score),
            model_name=RULE_MODEL_NAME,
            model_version=RULE_MODEL_VERSION,
            feature_schema_version=FEATURE_SCHEMA_VERSION,
            reason_codes=reasons or ["nominal_risk"],
            degraded=True,
        )

    feature_dict = payload.model_dump()
    row = [[float(bool(feature_dict.get(f)) if isinstance(feature_dict.get(f), bool) else feature_dict.get(f, 0) or 0) for f in AUTHENTICATION_FEATURES]]
    model_probability = float(model.predict_proba(row)[0][1])

    # Blend: the model captures nuanced interactions; rules add a hard floor for the failure-burst /
    # impossible-travel cases so a single bad signal can't be diluted away by an otherwise-clean history.
    blended_probability = max(model_probability, rule_score / 100 * 0.9)
    blended_score = round(blended_probability * 100, 2)

    return RiskAssessmentResponse(
        risk_probability=round(blended_probability, 4),
        risk_score=blended_score,
        risk_band=_band(blended_score),
        model_name=AUTH_MODEL_NAME,
        model_version=get_active_version(AUTH_MODEL_NAME) or "unknown",
        feature_schema_version=FEATURE_SCHEMA_VERSION,
        reason_codes=reasons or ["nominal_risk"],
        degraded=False,
    )


def assess_session_risk(payload: SessionRiskRequest) -> RiskAssessmentResponse:
    score = 0.0
    reasons: list[str] = []
    if payload.device_changed_recently:
        score += 30
        reasons.append("device_changed")
    if payload.session_duration_anomaly > 0.5:
        score += 25
        reasons.append("session_duration_anomaly")
    if not payload.known_device:
        score += 15
        reasons.append("unknown_device")

    return RiskAssessmentResponse(
        risk_probability=round(score / 100, 4),
        risk_score=round(score, 2),
        risk_band=_band(score),
        model_name=RULE_MODEL_NAME,
        model_version=RULE_MODEL_VERSION,
        feature_schema_version=FEATURE_SCHEMA_VERSION,
        reason_codes=reasons or ["nominal_risk"],
        degraded=True,
    )


def assess_recovery_risk(payload: RecoveryRiskRequest) -> RiskAssessmentResponse:
    score = 0.0
    reasons: list[str] = []
    if not payload.account_found:
        # Neutral score for a nonexistent account keeps the response shape identical either way,
        # so the policy engine and API response never leak account existence.
        score = 10
        reasons.append("nominal_risk")
    else:
        if payload.recovery_attempts_30d >= 3:
            score += 40
            reasons.append("frequent_recovery_attempts")
        else:
            reasons.append("nominal_risk")

    return RiskAssessmentResponse(
        risk_probability=round(score / 100, 4),
        risk_score=round(score, 2),
        risk_band=_band(score),
        model_name=RULE_MODEL_NAME,
        model_version=RULE_MODEL_VERSION,
        feature_schema_version=FEATURE_SCHEMA_VERSION,
        reason_codes=reasons,
        degraded=True,
    )
