from typing import Optional

from pydantic import BaseModel, Field


class AuthenticationRiskRequest(BaseModel):
    account_age_days: float = 0
    successful_signins_7d: float = 0
    failed_signins_5m: float = 0
    failed_signins_1h: float = 0
    failed_signins_24h: float = 0
    password_resets_30d: float = 0
    recovery_attempts_30d: float = 0
    mfa_enabled: bool = False
    passkey_available: bool = False
    known_device: bool = False
    trusted_device: bool = False
    ip_seen_before: bool = False
    country_seen_before: bool = True
    login_hour_deviation: float = 0
    impossible_travel_score: float = 0
    ip_hash: Optional[str] = None


class SessionRiskRequest(BaseModel):
    session_duration_anomaly: float = 0
    device_changed_recently: bool = False
    request_timing_pattern: float = 0
    known_device: bool = True


class RecoveryRiskRequest(BaseModel):
    account_found: bool = True
    recovery_attempts_30d: float = 0
    ip_hash: Optional[str] = None


class AbuseRequest(BaseModel):
    ip_hash: Optional[str] = None
    user_agent_hash: Optional[str] = None
    email_domain: Optional[str] = None
    request_velocity: float = 0
    ip_velocity: float = 0
    disposable_email_signal: bool = False


class RiskAssessmentResponse(BaseModel):
    model_config = {"protected_namespaces": ()}

    risk_probability: float = Field(ge=0, le=1)
    risk_score: float = Field(ge=0, le=100)
    risk_band: str
    model_name: str
    model_version: str
    feature_schema_version: str
    reason_codes: list[str]
    degraded: bool = False


class AbuseAssessmentResponse(BaseModel):
    model_config = {"protected_namespaces": ()}

    bot_probability: float = Field(ge=0, le=1)
    abuse_probability: float = Field(ge=0, le=1)
    model_name: str
    model_version: str
    reason_codes: list[str]
    degraded: bool = False
