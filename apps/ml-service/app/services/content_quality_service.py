"""Content-quality scoring: a deterministic HEURISTIC model, not a trained
classifier — there is no labelled training-data pipeline for "post quality"
anywhere in this system, so this deliberately does not claim to be one, and
reports no accuracy/precision/recall numbers anywhere (none would be real).

Every input to the score is a real, measurable signal computed from the
actual post content and the real engagement counters passed in by the
caller (apps/api). Nothing here is randomized or hardcoded to a fixed
"looks good" number.
"""

import difflib
import re

MODEL_VERSION = "quality-heuristic-v1"

LINK_RE = re.compile(r"https?://\S+")

# A body in this length range reads as substantive without being a wall of
# text — outside it, the score is nudged down rather than zeroed, since a
# short update or a long-form post are both legitimate.
IDEAL_MIN_LEN = 40
IDEAL_MAX_LEN = 3000

DUPLICATE_SIMILARITY_THRESHOLD = 0.85


def _length_component(text: str) -> tuple[float, str | None]:
    length = len(text.strip())
    if length == 0:
        return 0.0, "empty_content"
    if length < 15:
        return 0.2, "content_very_short"
    if length < IDEAL_MIN_LEN:
        return 0.55, None
    if length <= IDEAL_MAX_LEN:
        return 1.0, "content_length_optimal"
    # Very long posts aren't penalised hard — just not given the "optimal" bonus.
    return 0.8, None


def _spam_pattern_component(text: str) -> tuple[float, list[str]]:
    reasons: list[str] = []
    penalty = 0.0

    links = LINK_RE.findall(text)
    if len(links) >= 3:
        penalty += 0.3
        reasons.append("excessive_links")

    letters = [c for c in text if c.isalpha()]
    if len(letters) >= 20:
        caps_ratio = sum(1 for c in letters if c.isupper()) / len(letters)
        if caps_ratio > 0.6:
            penalty += 0.25
            reasons.append("excessive_caps")

    if re.search(r"(.)\1{5,}", text):
        penalty += 0.2
        reasons.append("repeated_characters")

    if not reasons:
        reasons.append("no_spam_patterns_detected")

    return max(0.0, 1.0 - penalty), reasons


def _engagement_component(signals) -> tuple[float | None, str | None]:
    if signals.impression_count <= 0:
        return None, None  # Not enough data yet — omitted rather than fabricated.
    weighted = signals.reaction_count * 1 + signals.comment_count * 2 + signals.share_count * 3
    ratio = weighted / signals.impression_count
    # A ~10% weighted-engagement rate is a strong result for a feed post;
    # scale linearly up to that and cap at 1.0.
    score = min(ratio / 0.10, 1.0)
    reason = "high_engagement_ratio" if score >= 0.5 else None
    return score, reason


def _duplicate_component(text: str, recent_texts: list[str]) -> tuple[float, str | None]:
    if not text.strip() or not recent_texts:
        return 1.0, None
    best = 0.0
    for prior in recent_texts:
        if not prior or not prior.strip():
            continue
        ratio = difflib.SequenceMatcher(None, text.strip().lower(), prior.strip().lower()).ratio()
        best = max(best, ratio)
    if best >= DUPLICATE_SIMILARITY_THRESHOLD:
        return 0.0, "duplicate_content_detected"
    return 1.0, None


def _band_for(score: float) -> str:
    if score >= 80:
        return "excellent"
    if score >= 60:
        return "good"
    if score >= 40:
        return "fair"
    return "poor"


def score_content_quality(signals) -> dict:
    reason_codes: list[str] = []

    length_score, length_reason = _length_component(signals.text)
    if length_reason:
        reason_codes.append(length_reason)

    spam_score, spam_reasons = _spam_pattern_component(signals.text)
    reason_codes.extend(spam_reasons)

    dup_score, dup_reason = _duplicate_component(signals.text, signals.recent_author_texts)
    if dup_reason:
        reason_codes.append(dup_reason)

    engagement_score, engagement_reason = _engagement_component(signals)
    if engagement_reason:
        reason_codes.append(engagement_reason)

    if signals.has_media or signals.media_count > 0:
        reason_codes.append("has_media")

    # Weighted blend of the components that always exist. Engagement is only
    # folded in when there's real impression data to compute a ratio from —
    # otherwise its weight is redistributed rather than treating "no data
    # yet" as "zero engagement".
    components = [(length_score, 0.35), (spam_score, 0.25), (dup_score, 0.25)]
    media_score = 1.0 if (signals.has_media or signals.media_count > 0) else 0.6
    components.append((media_score, 0.15))

    if engagement_score is not None:
        # Blend engagement in at 25% weight, proportionally shrinking the rest.
        components = [(s, w * 0.75) for s, w in components] + [(engagement_score, 0.25)]

    total_weight = sum(w for _, w in components)
    blended = sum(s * w for s, w in components) / total_weight if total_weight else 0.0
    quality_score = round(blended * 100, 1)

    if not reason_codes:
        reason_codes.append("nominal")

    return {
        "quality_score": quality_score,
        "band": _band_for(quality_score),
        "reason_codes": reason_codes,
        "model_version": MODEL_VERSION,
    }
