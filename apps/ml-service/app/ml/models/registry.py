"""Loads trained model artifacts by name, honoring the active version recorded in registry.json.

Falls back to `None` (never raises) so callers can degrade to deterministic rules when no
trained artifact is present yet (e.g. a fresh checkout before `train_risk_model` has run).
"""

import json
from functools import lru_cache
from pathlib import Path

from app.core.config import get_settings


@lru_cache
def _registry() -> dict:
    settings = get_settings()
    path = Path(settings.model_artifact_dir) / "registry.json"
    if not path.exists():
        return {}
    return json.loads(path.read_text())


def get_active_version(model_name: str) -> str | None:
    entry = _registry().get(model_name)
    return entry["active_version"] if entry else None


@lru_cache(maxsize=8)
def load_model(model_name: str):
    entry = _registry().get(model_name)
    if not entry or entry.get("status") != "active":
        return None
    try:
        import joblib

        return joblib.load(entry["artifact_path"])
    except Exception:
        return None


def get_metrics(model_name: str) -> dict | None:
    entry = _registry().get(model_name)
    if not entry:
        return None
    metrics_path = Path(entry["metrics_path"])
    if not metrics_path.exists():
        return None
    return json.loads(metrics_path.read_text())


def clear_cache() -> None:
    _registry.cache_clear()
    load_model.cache_clear()
