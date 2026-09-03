"""Model B: bot / account-abuse detection.

Two layers, matching risk_service.py:
  1. Deterministic rules — disposable-email / velocity heuristics, always available.
  2. Trained HistGradientBoostingClassifier (app.ml.training.train_abuse_model) — nuanced
     scoring on request/IP velocity patterns once trained.

Falls back to rules-only (degraded=True) if no trained artifact is present yet.
"""

from app.ml.models.registry import get_active_version, load_model
from app.ml.pipelines.abuse_features import ABUSE_FEATURES
from app.ml.training.train_abuse_model import MODEL_NAME as ABUSE_MODEL_NAME

DISPOSABLE_DOMAINS = {"mailinator.com", "10minutemail.com", "tempmail.com", "guerrillamail.com", "yopmail.com"}


def _rule_score(payload) -> tuple[float, list[str]]:
    score = 0.0
    reasons: list[str] = []

    domain = (getattr(payload, "email_domain", None) or "").lower()
    if domain in DISPOSABLE_DOMAINS:
        score += 0.5
        reasons.append("disposable_email_domain")
    if payload.disposable_email_signal:
        score += 0.3
        reasons.append("disposable_email_signal")
    if payload.request_velocity > 5:
        score += 0.2
        reasons.append("high_request_velocity")
    if payload.ip_velocity > 10:
        score += 0.3
        reasons.append("high_ip_velocity")

    return min(score, 1.0), reasons


def _assess(payload) -> dict:
    rule_score, reasons = _rule_score(payload)
    model = load_model(ABUSE_MODEL_NAME)

    if model is None:
        return {
            "bot_probability": round(rule_score, 4),
            "abuse_probability": round(rule_score, 4),
            "model_name": "deterministic-rules",
            "model_version": "v1",
            "reason_codes": reasons or ["nominal"],
            "degraded": True,
        }

    domain = (getattr(payload, "email_domain", None) or "").lower()
    feature_dict = {
        "request_velocity": payload.request_velocity,
        "ip_velocity": payload.ip_velocity,
        "disposable_email_signal": payload.disposable_email_signal,
        "is_disposable_domain": domain in DISPOSABLE_DOMAINS,
    }
    row = [[float(bool(feature_dict.get(f)) if isinstance(feature_dict.get(f), bool) else feature_dict.get(f, 0) or 0) for f in ABUSE_FEATURES]]
    model_probability = float(model.predict_proba(row)[0][1])
    blended = max(model_probability, rule_score * 0.9)

    return {
        "bot_probability": round(blended, 4),
        "abuse_probability": round(blended, 4),
        "model_name": ABUSE_MODEL_NAME,
        "model_version": get_active_version(ABUSE_MODEL_NAME) or "unknown",
        "reason_codes": reasons or ["nominal"],
        "degraded": False,
    }


def assess_signup_abuse(payload) -> dict:
    return _assess(payload)


def assess_signin_abuse(payload) -> dict:
    return _assess(payload)
