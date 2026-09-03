from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import health, matching, risk, feed, seo, imports, content, project_intelligence
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(title="Gigvora ML Service", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.api_service_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(matching.router)
app.include_router(risk.router)
app.include_router(feed.router)
app.include_router(seo.router)
app.include_router(imports.router)
app.include_router(content.router)
app.include_router(project_intelligence.router)
