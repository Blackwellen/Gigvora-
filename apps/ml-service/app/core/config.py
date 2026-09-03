from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", protected_namespaces=("settings_",))

    environment: str = "development"
    host: str = "0.0.0.0"
    port: int = 8000

    database_url: str = "postgresql+psycopg2://gigvora:gigvora@localhost:5432/gigvora"
    redis_url: str = "redis://localhost:6379"

    api_key: str = "change_me_ml_key"
    api_service_url: str = "http://localhost:4000"

    model_artifact_dir: str = "./app/ml/models/artifacts"


@lru_cache
def get_settings() -> Settings:
    return Settings()
