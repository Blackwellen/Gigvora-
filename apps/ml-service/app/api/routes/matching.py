from fastapi import APIRouter, Depends

from app.core.security import verify_api_key
from app.schemas.matching import MatchRequest, MatchResponse, RecommendationsResponse
from app.services import matching_service

router = APIRouter(prefix="/api/v1", tags=["matching"], dependencies=[Depends(verify_api_key)])


@router.post("/match", response_model=MatchResponse)
def match(request: MatchRequest) -> MatchResponse:
    return matching_service.compute_match(request.job_id, request.applicant_id)


@router.get("/recommendations/{user_id}", response_model=RecommendationsResponse)
def recommendations(user_id: str) -> RecommendationsResponse:
    return RecommendationsResponse(**matching_service.get_recommendations(user_id))
