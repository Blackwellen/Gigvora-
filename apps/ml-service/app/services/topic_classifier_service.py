"""Topic classification against the real `topics` table
(apps/api/src/db/migrations/20260101000057_create_hashtag_taxonomy.js).

This is deterministic keyword-overlap matching, not an embedding model —
there is no embedding index or training pipeline in this system, so this
does not claim to be one. It is explainable (the matched keywords are the
whole "model") and real: every suggestion is computed from the actual post
text against the actual topics rows in the database, not a fixed list.
"""

import re

from sqlalchemy import text as sql_text

from app.core.database import engine

MODEL_VERSION = "topic-keyword-overlap-v1"

STOPWORDS = {
    "the", "a", "an", "and", "or", "but", "is", "are", "was", "were", "be", "been",
    "to", "of", "in", "on", "for", "with", "at", "by", "from", "up", "about", "into",
    "this", "that", "these", "those", "it", "its", "as", "we", "you", "i", "our",
    "your", "my", "their", "his", "her", "they", "he", "she", "will", "can", "just",
    "not", "no", "so", "if", "than", "then", "how", "what", "when", "where", "why",
}

WORD_RE = re.compile(r"[a-z0-9']+")


def _tokenize(value: str) -> set[str]:
    return {w for w in WORD_RE.findall(value.lower()) if w not in STOPWORDS and len(w) > 2}


def _load_active_topics() -> list[dict]:
    with engine.connect() as conn:
        rows = conn.execute(
            sql_text("SELECT id, slug, label, description FROM topics WHERE status = 'active'")
        ).mappings().all()
    return [dict(r) for r in rows]


def classify_topics(text: str, max_suggestions: int = 3) -> dict:
    post_tokens = _tokenize(text)
    suggestions: list[dict] = []

    if post_tokens:
        try:
            topics = _load_active_topics()
        except Exception:
            # DB unreachable — fail to an empty (not fabricated) suggestion
            # list rather than raising, matching the "never break the
            # caller" resilience rule the feed ranker follows.
            topics = []

        for topic in topics:
            topic_tokens = _tokenize(f"{topic['label']} {topic.get('description') or ''} {topic['slug'].replace('-', ' ')}")
            if not topic_tokens:
                continue
            overlap = post_tokens & topic_tokens
            if not overlap:
                continue
            # Confidence = how much of the topic's own vocabulary showed up
            # in the post, capped at 1.0 — explainable and bounded.
            confidence = min(len(overlap) / max(len(topic_tokens), 1), 1.0)
            suggestions.append(
                {
                    "topic_id": str(topic["id"]),
                    "slug": topic["slug"],
                    "label": topic["label"],
                    "confidence": round(confidence, 4),
                }
            )

        suggestions.sort(key=lambda s: s["confidence"], reverse=True)

    return {
        "suggestions": suggestions[:max_suggestions],
        "model_version": MODEL_VERSION,
    }
