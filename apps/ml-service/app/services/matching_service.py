import random

from app.schemas.matching import MatchInsights, MatchResponse


def compute_match(job_id: str, applicant_id: str) -> MatchResponse:
    """Placeholder scoring model. Replace with the trained model in app/ml/models."""
    score = round(random.uniform(50, 99), 2)
    insights = MatchInsights(skill_overlap=[], missing_skills=[], seniority_fit="mid")
    return MatchResponse(match_score=score, insights=insights)


def get_recommendations(user_id: str) -> dict:
    """Placeholder recommendation model. Replace with the trained model in app/ml/models."""
    return {"jobs": [], "people": []}
