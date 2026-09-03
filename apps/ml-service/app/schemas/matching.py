from pydantic import BaseModel, ConfigDict, Field


class MatchRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    application_id: str = Field(alias="applicationId")
    job_id: str = Field(alias="jobId")
    applicant_id: str = Field(alias="applicantId")


class MatchInsights(BaseModel):
    skill_overlap: list[str] = []
    missing_skills: list[str] = []
    seniority_fit: str | None = None


class MatchResponse(BaseModel):
    match_score: float
    insights: MatchInsights


class RecommendationsResponse(BaseModel):
    jobs: list[dict] = []
    people: list[dict] = []
