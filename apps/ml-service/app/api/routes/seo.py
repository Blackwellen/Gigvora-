from fastapi import APIRouter, Depends

from app.core.database import get_db
from app.core.security import verify_api_key
from app.services import seo_clustering_service

router = APIRouter(prefix="/api/v1", tags=["seo"], dependencies=[Depends(verify_api_key)])


@router.post("/seo/topic-clustering/run")
def run_topic_clustering() -> dict:
    """Recomputes SEO topic clusters over published resource/help content.

    Internal/admin-triggered only (verify_api_key) — never called from a
    public route. Results land in `content_topic_clusters` for editorial
    review; nothing here auto-publishes content changes.
    """
    db = next(get_db())
    try:
        return seo_clustering_service.run_clustering(db)
    finally:
        db.close()
