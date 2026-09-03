from fastapi import APIRouter, Depends

from app.core.security import verify_api_key
from app.ml.models import online_feed_ranker
from app.schemas.feed import FeedScoreRequest, FeedScoreResponse, FeedTrainingExample, FeedTrainResponse
from app.services import feed_ranking_service

router = APIRouter(prefix="/api/v1/feed", tags=["feed"], dependencies=[Depends(verify_api_key)])


@router.post("/score", response_model=FeedScoreResponse)
def score(payload: FeedScoreRequest) -> FeedScoreResponse:
    return feed_ranking_service.score_candidates(payload.candidates)


@router.post("/train", response_model=FeedTrainResponse)
def train(payload: FeedTrainingExample) -> FeedTrainResponse:
    return feed_ranking_service.train(payload)


@router.get("/model-status")
def model_status() -> dict:
    return online_feed_ranker.stats()
