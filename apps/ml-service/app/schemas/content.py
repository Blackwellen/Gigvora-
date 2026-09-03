from pydantic import BaseModel, Field


# Hard input-size caps — a payload this large is either a client bug or a
# deliberate attempt to burn CPU/memory on the ML service; reject rather than
# process. Ordinary post/article/comment bodies are nowhere near this size.
MAX_TEXT_LEN = 20_000
MAX_RECENT_TEXTS = 20


class QualitySignals(BaseModel):
    text: str = Field(default="", max_length=MAX_TEXT_LEN)
    has_media: bool = False
    media_count: int = 0
    reaction_count: int = 0
    comment_count: int = 0
    share_count: int = 0
    impression_count: int = 0
    # Author's other recent post bodies, fetched and passed in by the caller
    # (apps/api already has DB access — the ML service doesn't need its own
    # round trip for this) so a simple duplicate-content check can run
    # against real prior content rather than nothing.
    recent_author_texts: list[str] = Field(default_factory=list, max_length=MAX_RECENT_TEXTS)


class QualityScoreResponse(BaseModel):
    model_config = {"protected_namespaces": ()}

    quality_score: float = Field(ge=0, le=100)
    band: str  # poor | fair | good | excellent
    reason_codes: list[str]
    model_version: str


class TopicClassifyRequest(BaseModel):
    text: str = Field(default="", max_length=MAX_TEXT_LEN)
    max_suggestions: int = Field(default=3, ge=1, le=10)


class TopicSuggestion(BaseModel):
    topic_id: str
    slug: str
    label: str
    confidence: float = Field(ge=0, le=1)


class TopicClassifyResponse(BaseModel):
    model_config = {"protected_namespaces": ()}

    suggestions: list[TopicSuggestion]
    model_version: str


class ModerationScreenRequest(BaseModel):
    text: str = Field(default="", max_length=MAX_TEXT_LEN)
    author_id: str | None = Field(default=None, max_length=64)
    object_type: str = Field(default="post", max_length=32)  # post | article | comment


class ModerationScreenResponse(BaseModel):
    model_config = {"protected_namespaces": ()}

    label: str  # allow | warn | hold_for_review
    reason_codes: list[str]
    model_version: str
