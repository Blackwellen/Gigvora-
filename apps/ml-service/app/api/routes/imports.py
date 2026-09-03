from fastapi import APIRouter, Depends

from app.core.security import verify_api_key
from app.schemas.imports import (
    DedupeScoreRequest,
    DedupeScoreResponse,
    ExtractCvRequest,
    ExtractCvResponse,
    MapFieldsRequest,
    MapFieldsResponse,
)
from app.services import import_intelligence_service

router = APIRouter(prefix="/api/v1/imports", tags=["imports"], dependencies=[Depends(verify_api_key)])


@router.post("/extract-cv", response_model=ExtractCvResponse)
def extract_cv(payload: ExtractCvRequest) -> ExtractCvResponse:
    return import_intelligence_service.extract_cv(payload)


@router.post("/map-fields", response_model=MapFieldsResponse)
def map_fields(payload: MapFieldsRequest) -> MapFieldsResponse:
    return import_intelligence_service.map_fields(payload)


@router.post("/dedupe-score", response_model=DedupeScoreResponse)
def dedupe_score(payload: DedupeScoreRequest) -> DedupeScoreResponse:
    return import_intelligence_service.dedupe_score(payload)
