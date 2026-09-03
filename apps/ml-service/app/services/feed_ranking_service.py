"""feed_ranker: Live Feed candidate scoring.

Two layers, same shape as risk_service:
  1. Deterministic rules — recency decay + engagement velocity + relationship
     boost. Cheap, explainable, always available. This mirrors the
     deterministic ranker already in apps/api/src/modules/posts/posts.service.js
     so a caller never sees a jarring exact reordering if the model layer is
     unavailable.
  2. Online model (SGDClassifier, updated via partial_fit in real time) —
     blended in only once it has learned from at least one positive and one
     negative real interaction. Before that this degrades to rules-only.

This module only produces relevance scores. It never decides what's shown —
apps/api still applies visibility/workspace authorization before any
candidate reaches here.
"""

from app.ml.models import online_feed_ranker
from app.ml.pipelines.feed_features import FEATURE_SCHEMA_VERSION
from app.schemas.feed import FeedCandidateFeatures, FeedCandidateScore, FeedScoreResponse, FeedTrainingExample, FeedTrainResponse


def _rule_score(f: FeedCandidateFeatures) -> float:
    engagement = f.reaction_count * 1 + f.comment_count * 2 + f.share_count * 3
    decay = 1 / (1 + max(f.age_hours, 0) / 24)
    relationship_boost = 1.4 if (f.is_connection_or_self or f.is_own_post) else 1.0
    pin_boost = 1.5 if f.is_pinned else 1.0
    affinity_boost = 1 + min(f.author_reaction_affinity + f.author_comment_affinity, 1.0) * 0.3
    return (1 + engagement) * decay * relationship_boost * pin_boost * affinity_boost


def score_candidates(candidates: list[FeedCandidateFeatures]) -> FeedScoreResponse:
    ready = online_feed_ranker.is_ready()
    scores: list[FeedCandidateScore] = []

    for candidate in candidates:
        rule_value = _rule_score(candidate)
        if ready:
            model_prob = online_feed_ranker.predict_score(candidate.model_dump())
            # Blend: normalize the rule score into a comparable [0,1]-ish range via
            # a soft cap, then average with the learned probability so early model
            # noise can't wildly override the auditable baseline.
            normalized_rule = min(rule_value / 20, 1.0)
            blended = (model_prob or normalized_rule) * 0.6 + normalized_rule * 0.4
            scores.append(FeedCandidateScore(post_id=candidate.post_id, score=blended, source="online_model"))
        else:
            scores.append(FeedCandidateScore(post_id=candidate.post_id, score=rule_value, source="rules"))

    return FeedScoreResponse(
        scores=scores,
        model_name=online_feed_ranker.MODEL_NAME,
        model_version=online_feed_ranker.MODEL_VERSION if ready else "rules-fallback",
        feature_schema_version=FEATURE_SCHEMA_VERSION,
        degraded=not ready,
    )


def train(example: FeedTrainingExample) -> FeedTrainResponse:
    result = online_feed_ranker.learn(example.features.model_dump(), example.label)
    return FeedTrainResponse(
        accepted=True,
        examples_seen=result["examplesSeen"],
        positive_seen=result["positiveSeen"],
        negative_seen=result["negativeSeen"],
        ready=result["ready"],
    )
