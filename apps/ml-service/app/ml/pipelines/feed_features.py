"""Versioned feature schema for the Live Feed ranker (feed_ranker).

Every candidate a viewer could be shown is reduced to this fixed feature
vector before scoring or training — the deterministic Node-side ranker
(apps/api/src/modules/posts/posts.service.js) computes the same underlying
signals independently, so this schema mirrors those field names 1:1.
"""

FEATURE_SCHEMA_VERSION = "v1"

FEED_RANKING_FEATURES = [
    "age_hours",
    "reaction_count",
    "comment_count",
    "share_count",
    "is_pinned",
    "is_connection_or_self",
    "is_own_post",
    "author_reaction_affinity",
    "author_comment_affinity",
]


def feed_feature_vector(payload: dict) -> list[float]:
    return [float(payload.get(f, 0) or 0) for f in FEED_RANKING_FEATURES]
