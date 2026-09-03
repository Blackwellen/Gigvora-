"""Pydantic schemas for the import-intelligence endpoints (Domain 04 onboarding/imports).

All three endpoints are deterministic/rule-based (see import_intelligence_service.py) —
no trained model exists yet, so `model_version` is always reported as "rule-based-v1"
per the plan's provenance-honesty requirement (§56/§60).
"""

from __future__ import annotations

from typing import Any, Generic, Literal, TypeVar

from pydantic import BaseModel, ConfigDict, Field, field_validator

T = TypeVar("T")

# Hard caps so adversarial import content can never cause CPU/memory exhaustion.
MAX_CV_TEXT_CHARS = 200_000
MAX_HEADERS = 200
MAX_SAMPLE_VALUES_PER_HEADER = 50
MAX_SAMPLE_VALUE_CHARS = 500
MAX_ENTITY_FIELD_COUNT = 100
MAX_ENTITY_FIELD_VALUE_CHARS = 2_000


class ScoredField(BaseModel, Generic[T]):
    """A single extracted field paired with a 0-1 confidence score."""

    value: T
    confidence: float = Field(ge=0, le=1)


# ---------------------------------------------------------------------------
# /extract-cv
# ---------------------------------------------------------------------------


class ExperienceEntry(BaseModel):
    company: str | None = None
    title: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    description: str | None = None


class EducationEntry(BaseModel):
    institution: str | None = None
    degree: str | None = None
    field: str | None = None
    start_date: str | None = None
    end_date: str | None = None


class ExtractCvRequest(BaseModel):
    source_import_file_id: str = Field(min_length=1, max_length=128)
    # Raw text already parsed server-side (PDF/DOCX -> text) by Node. Treated
    # strictly as untrusted DATA here: it is only ever fed into regex/heuristic
    # extraction, never into a prompt, tool call, or anything execution-adjacent.
    text: str = Field(max_length=MAX_CV_TEXT_CHARS)


class ExtractCvResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    source_import_file_id: str
    name: ScoredField[str | None]
    headline: ScoredField[str | None]
    summary: ScoredField[str | None]
    email: ScoredField[str | None]
    phone: ScoredField[str | None]
    location: ScoredField[str | None]
    experience: ScoredField[list[ExperienceEntry]]
    education: ScoredField[list[EducationEntry]]
    skills: ScoredField[list[str]]
    certifications: ScoredField[list[str]]
    projects: ScoredField[list[str]]
    languages: ScoredField[list[str]]
    links: ScoredField[list[str]]
    model_name: str = "cv_entity_extractor"
    model_version: str = "rule-based-v1"


# ---------------------------------------------------------------------------
# /map-fields
# ---------------------------------------------------------------------------

TargetSchema = Literal["company_import", "contact_import"]


class SourceHeaderSample(BaseModel):
    source_header: str = Field(min_length=1, max_length=200)
    sample_values: list[str] = Field(default_factory=list, max_length=MAX_SAMPLE_VALUES_PER_HEADER)

    @field_validator("sample_values")
    @classmethod
    def _cap_sample_value_length(cls, values: list[str]) -> list[str]:
        return [v[:MAX_SAMPLE_VALUE_CHARS] for v in values]


class MapFieldsRequest(BaseModel):
    target_schema: TargetSchema
    headers: list[SourceHeaderSample] = Field(max_length=MAX_HEADERS)


class FieldMappingSuggestion(BaseModel):
    source_header: str
    target_field: str | None
    confidence: float = Field(ge=0, le=1)
    reason: str


class MapFieldsResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    target_schema: TargetSchema
    mappings: list[FieldMappingSuggestion]
    model_name: str = "import_field_mapper"
    model_version: str = "rule-based-v1"


# ---------------------------------------------------------------------------
# /dedupe-score
# ---------------------------------------------------------------------------

EntityType = Literal["contact", "company", "profile"]


class DedupeScoreRequest(BaseModel):
    entity_type: EntityType
    candidate: dict[str, Any]
    existing: dict[str, Any]

    @field_validator("candidate", "existing")
    @classmethod
    def _cap_entity_payload(cls, payload: dict[str, Any]) -> dict[str, Any]:
        if len(payload) > MAX_ENTITY_FIELD_COUNT:
            raise ValueError(f"entity payload exceeds {MAX_ENTITY_FIELD_COUNT} fields")
        cleaned: dict[str, Any] = {}
        for key, value in payload.items():
            if isinstance(value, str):
                cleaned[key] = value[:MAX_ENTITY_FIELD_VALUE_CHARS]
            else:
                cleaned[key] = value
        return cleaned


class DedupeScoreResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    entity_type: EntityType
    match_probability: float = Field(ge=0, le=1)
    confidence_band: Literal["low", "medium", "high"]
    reason_codes: list[str]
    model_name: str = "contact_dedupe"
    model_version: str = "rule-based-v1"
