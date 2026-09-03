"""Versioned feature schemas for Domain 03 risk models.

Bumping FEATURE_SCHEMA_VERSION signals that stored risk_assessments rows produced under an
older schema are not directly comparable to new ones (different feature ordering/semantics).
"""

FEATURE_SCHEMA_VERSION = "v1"

AUTHENTICATION_FEATURES = [
    "account_age_days",
    "successful_signins_7d",
    "failed_signins_5m",
    "failed_signins_1h",
    "failed_signins_24h",
    "password_resets_30d",
    "recovery_attempts_30d",
    "mfa_enabled",
    "passkey_available",
    "known_device",
    "trusted_device",
    "ip_seen_before",
    "country_seen_before",
    "login_hour_deviation",
    "impossible_travel_score",
]


def authentication_feature_vector(payload: dict) -> list[float]:
    return [float(bool(payload.get(f)) if isinstance(payload.get(f), bool) else payload.get(f, 0) or 0) for f in AUTHENTICATION_FEATURES]
