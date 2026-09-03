from fastapi import APIRouter, Depends

from app.core.security import verify_api_key
from app.schemas.content import (
    ModerationScreenRequest,
    ModerationScreenResponse,
    QualityScoreResponse,
    QualitySignals,
    TopicClassifyRequest,
    TopicClassifyResponse,
)
from app.services import content_quality_service, moderation_service, topic_classifier_service

router = APIRouter(prefix="/api/v1/content", tags=["content"], dependencies=[Depends(verify_api_key)])


@router.post("/quality-score", response_model=QualityScoreResponse)
def quality_score(payload: QualitySignals) -> QualityScoreResponse:
    return QualityScoreResponse(**content_quality_service.score_content_quality(payload))


@router.post("/classify-topics", response_model=TopicClassifyResponse)
def classify_topics(payload: TopicClassifyRequest) -> TopicClassifyResponse:
    return TopicClassifyResponse(**topic_classifier_service.classify_topics(payload.text, payload.max_suggestions))


@router.post("/moderation-screen", response_model=ModerationScreenResponse)
def moderation_screen(payload: ModerationScreenRequest) -> ModerationScreenResponse:
    return ModerationScreenResponse(
        **moderation_service.screen_content(payload.text, payload.author_id, payload.object_type)
    )
