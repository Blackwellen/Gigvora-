"""feed_ranker: an online-learning model that updates in production traffic.

Unlike the batch-trained risk/abuse models (offline `train_*` script -> static
.joblib artifact, loaded read-only), this model has no offline training data
to start from — Gigvora is a fresh product with no interaction history yet.
Rather than fabricate a "trained" model on synthetic data, it starts as an
untrained scikit-learn SGDClassifier (log-loss, i.e. online logistic
regression) and calls `partial_fit` on every real labeled interaction as it
happens (a reaction/comment/save/share = positive, an undo = negative),
persisting its weights to disk after each update so learning survives
restarts. Until it has seen both classes at least once, `predict_score`
returns None so callers fall back to the deterministic ranker — it never
serves an untrained model's arbitrary output as a real signal.
"""

import json
import threading
from datetime import datetime, timezone
from pathlib import Path

from app.core.config import get_settings
from app.ml.pipelines.feed_features import FEATURE_SCHEMA_VERSION, FEED_RANKING_FEATURES

MODEL_NAME = "feed_ranker"
MODEL_VERSION = "v1-online"

_lock = threading.Lock()
_state = {"model": None, "examples_seen": 0, "positive_seen": 0, "negative_seen": 0}


def _artifact_path() -> Path:
    return Path(get_settings().model_artifact_dir) / f"{MODEL_NAME}-{MODEL_VERSION}.joblib"


def _state_path() -> Path:
    return Path(get_settings().model_artifact_dir) / f"{MODEL_NAME}-{MODEL_VERSION}.state.json"


def _registry_path() -> Path:
    return Path(get_settings().model_artifact_dir) / "registry.json"


def _load() -> None:
    if _state["model"] is not None:
        return
    artifact = _artifact_path()
    state_file = _state_path()
    if artifact.exists():
        import joblib

        _state["model"] = joblib.load(artifact)
        if state_file.exists():
            saved = json.loads(state_file.read_text())
            _state["examples_seen"] = saved.get("examples_seen", 0)
            _state["positive_seen"] = saved.get("positive_seen", 0)
            _state["negative_seen"] = saved.get("negative_seen", 0)
    else:
        from sklearn.linear_model import SGDClassifier

        _state["model"] = SGDClassifier(loss="log_loss", learning_rate="optimal", random_state=42)


def _persist() -> None:
    import joblib

    artifact_dir = Path(get_settings().model_artifact_dir)
    artifact_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump(_state["model"], _artifact_path())
    _state_path().write_text(
        json.dumps(
            {
                "examples_seen": _state["examples_seen"],
                "positive_seen": _state["positive_seen"],
                "negative_seen": _state["negative_seen"],
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        )
    )
    _update_registry()


def _update_registry() -> None:
    reg_path = _registry_path()
    registry = json.loads(reg_path.read_text()) if reg_path.exists() else {}
    registry[MODEL_NAME] = {
        "active_version": MODEL_VERSION,
        "artifact_path": str(_artifact_path()),
        "metrics_path": str(_state_path()),
        "status": "active" if is_ready() else "shadow",
        "model_type": "online",
        "feature_schema_version": FEATURE_SCHEMA_VERSION,
        "deployed_at": datetime.now(timezone.utc).isoformat(),
    }
    reg_path.write_text(json.dumps(registry, indent=2))


def is_ready() -> bool:
    """Ready once the model has seen at least one example of each class."""
    return _state["positive_seen"] > 0 and _state["negative_seen"] > 0


def learn(features: dict, label: int) -> dict:
    """Incorporates one real (features, label) pair immediately via partial_fit."""
    with _lock:
        _load()
        x = [[float(features.get(f, 0) or 0) for f in FEED_RANKING_FEATURES]]
        y = [int(bool(label))]
        _state["model"].partial_fit(x, y, classes=[0, 1])
        _state["examples_seen"] += 1
        if y[0] == 1:
            _state["positive_seen"] += 1
        else:
            _state["negative_seen"] += 1
        _persist()
        return {
            "examplesSeen": _state["examples_seen"],
            "positiveSeen": _state["positive_seen"],
            "negativeSeen": _state["negative_seen"],
            "ready": is_ready(),
        }


def predict_score(features: dict) -> float | None:
    """Returns P(meaningful engagement) in [0, 1], or None if not yet ready to serve."""
    with _lock:
        _load()
        if not is_ready():
            return None
        x = [[float(features.get(f, 0) or 0) for f in FEED_RANKING_FEATURES]]
        return float(_state["model"].predict_proba(x)[0][1])


def stats() -> dict:
    with _lock:
        _load()
        return {
            "modelName": MODEL_NAME,
            "modelVersion": MODEL_VERSION,
            "featureSchemaVersion": FEATURE_SCHEMA_VERSION,
            "examplesSeen": _state["examples_seen"],
            "positiveSeen": _state["positive_seen"],
            "negativeSeen": _state["negative_seen"],
            "ready": is_ready(),
        }
