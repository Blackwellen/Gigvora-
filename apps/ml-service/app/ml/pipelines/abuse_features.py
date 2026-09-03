"""Feature schema for Model B (bot / account-abuse detection)."""

ABUSE_FEATURE_SCHEMA_VERSION = "v1"

ABUSE_FEATURES = [
    "request_velocity",
    "ip_velocity",
    "disposable_email_signal",
    "is_disposable_domain",
]


def abuse_feature_vector(payload: dict) -> list[float]:
    return [float(bool(payload.get(f)) if isinstance(payload.get(f), bool) else payload.get(f, 0) or 0) for f in ABUSE_FEATURES]
