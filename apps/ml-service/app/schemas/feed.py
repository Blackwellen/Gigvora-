from pydantic import BaseModel, Field


class FeedCandidateFeatures(BaseModel):
    post_id: str
    age_hours: float = 0
    reaction_count: int = 0
    comment_count: int = 0
    share_count: int = 0
    is_pinned: bool = False
    is_connection_or_self: bool = False
    is_own_post: bool = False
    author_reaction_affinity: float = 0
    author_comment_affinity: float = 0


class FeedScoreRequest(BaseModel):
    viewer_id: str
    candidates: list[FeedCandidateFeatures]


class FeedCandidateScore(BaseModel):
    post_id: str
    score: float
    source: str  # "online_model" | "rules"


class FeedScoreResponse(BaseModel):
    scores: list[FeedCandidateScore]
    model_name: str
    model_version: str
    feature_schema_version: str
    degraded: bool


class FeedTrainingExample(BaseModel):
    viewer_id: str
    post_id: str
    label: int = Field(ge=0, le=1)  # 1 = meaningful engagement, 0 = explicit undo/negative
    features: FeedCandidateFeatures


class FeedTrainResponse(BaseModel):
    accepted: bool
    examples_seen: int
    positive_seen: int
    negative_seen: int
    ready: bool
