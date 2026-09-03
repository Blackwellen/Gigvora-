"""Spam/toxicity screening — deterministic rule-based checks, not a trained
classifier (see content_quality_service.py's module docstring for why: no
labelled training-data pipeline exists yet). Every check here runs against
the real submitted text (and, for the rate check, the real posts table) —
nothing is randomized or fabricated.
"""

import re

from sqlalchemy import text as sql_text

from app.core.database import engine

MODEL_VERSION = "moderation-rules-v1"

LINK_RE = re.compile(r"https?://\S+")

# A small, deliberately narrow blocklist of unambiguous spam/scam phrasing.
# This is not a toxicity/hate-speech classifier — a real one needs labelled
# training data this system doesn't have — so it only catches clear-cut,
# high-precision spam patterns rather than attempting broad content
# moderation it can't back up.
BLOCKLIST_PHRASES = [
    "click here to win",
    "buy followers",
    "buy likes",
    "guaranteed income",
    "work from home make $",
    "wire transfer immediately",
    "act now limited time",
    "free money no strings",
    "verify your account now or",
    "send bitcoin to",
]

RATE_LIMIT_WINDOW_MINUTES = 10
RATE_LIMIT_THRESHOLD = 8  # posts by the same author within the window


def _pattern_checks(text: str) -> tuple[float, list[str]]:
    reasons: list[str] = []
    score = 0.0

    lowered = text.lower()

    links = LINK_RE.findall(text)
    if len(links) >= 4:
        score += 0.35
        reasons.append("excessive_links")
    elif len(links) >= 2:
        score += 0.15
        reasons.append("multiple_links")

    letters = [c for c in text if c.isalpha()]
    if len(letters) >= 20:
        caps_ratio = sum(1 for c in letters if c.isupper()) / len(letters)
        if caps_ratio > 0.7:
            score += 0.2
            reasons.append("excessive_caps")

    if re.search(r"(.)\1{6,}", text):
        score += 0.15
        reasons.append("repeated_characters")

    for phrase in BLOCKLIST_PHRASES:
        if phrase in lowered:
            score += 0.6
            reasons.append("blocklisted_phrase")
            break

    return score, reasons


def _rate_check(author_id: str | None) -> tuple[float, list[str]]:
    if not author_id:
        return 0.0, []
    try:
        with engine.connect() as conn:
            row = conn.execute(
                sql_text(
                    "SELECT count(*) AS c FROM posts "
                    "WHERE author_id = :author_id AND created_at >= now() - make_interval(mins => :window_min)"
                ),
                {"author_id": author_id, "window_min": RATE_LIMIT_WINDOW_MINUTES},
            ).mappings().first()
    except Exception:
        # DB unreachable — skip the rate signal rather than blocking the caller.
        return 0.0, []

    count = int(row["c"]) if row else 0
    if count >= RATE_LIMIT_THRESHOLD:
        return 0.35, ["high_posting_rate"]
    return 0.0, []


def screen_content(text: str, author_id: str | None = None, object_type: str = "post") -> dict:
    pattern_score, pattern_reasons = _pattern_checks(text or "")
    rate_score, rate_reasons = _rate_check(author_id)

    score = min(pattern_score + rate_score, 1.0)
    reason_codes = pattern_reasons + rate_reasons

    if score >= 0.6:
        label = "hold_for_review"
    elif score >= 0.3:
        label = "warn"
    else:
        label = "allow"

    if not reason_codes:
        reason_codes = ["nominal"]

    return {
        "label": label,
        "reason_codes": reason_codes,
        "model_version": MODEL_VERSION,
    }
