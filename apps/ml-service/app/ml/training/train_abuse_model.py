"""Trains the Domain 03 bot/account-abuse model (Model B).

Same caveat as train_risk_model.py: this dataset is SYNTHETIC, generated from the rules that
define bot-like behaviour (high request/IP velocity, disposable-email signals). It exercises
the full train/evaluate/register/serve pipeline end-to-end with real metrics, but is not a
measurement of real-world abuse-detection performance — retrain on labelled auth_attempts +
confirmed security_alert outcomes once that telemetry exists.

Run with: python -m app.ml.training.train_abuse_model
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import average_precision_score, brier_score_loss, roc_auc_score

from app.core.config import get_settings
from app.ml.pipelines.abuse_features import ABUSE_FEATURES, ABUSE_FEATURE_SCHEMA_VERSION

MODEL_NAME = "abuse-hgb"
MODEL_VERSION = "1.0.0"
RNG = np.random.default_rng(7)


def _synthesize(n: int, start: datetime) -> pd.DataFrame:
    rows = []
    for i in range(n):
        is_bot = RNG.random() < 0.25
        if is_bot:
            request_velocity = RNG.gamma(6, 2)
            ip_velocity = RNG.gamma(8, 2)
            disposable_signal = RNG.random() < 0.5
            disposable_domain = RNG.random() < 0.4
        else:
            request_velocity = RNG.gamma(1.5, 1.2)
            ip_velocity = RNG.gamma(1.2, 1.5)
            disposable_signal = RNG.random() < 0.03
            disposable_domain = RNG.random() < 0.02

        rows.append(
            {
                "request_velocity": request_velocity,
                "ip_velocity": ip_velocity,
                "disposable_email_signal": disposable_signal,
                "is_disposable_domain": disposable_domain,
                "label": int(is_bot),
                "event_time": start + timedelta(minutes=i),
            }
        )
    return pd.DataFrame(rows)


def train() -> dict:
    settings = get_settings()
    start = datetime(2026, 1, 1, tzinfo=timezone.utc)
    df = _synthesize(15000, start).sort_values("event_time").reset_index(drop=True)

    n = len(df)
    train_df = df.iloc[: int(n * 0.7)]
    val_df = df.iloc[int(n * 0.7) : int(n * 0.85)]
    test_df = df.iloc[int(n * 0.85) :]

    x_train, y_train = train_df[ABUSE_FEATURES].astype(float), train_df["label"]
    x_val, y_val = val_df[ABUSE_FEATURES].astype(float), val_df["label"]
    x_test, y_test = test_df[ABUSE_FEATURES].astype(float), test_df["label"]

    model = HistGradientBoostingClassifier(max_depth=3, learning_rate=0.1, max_iter=100, random_state=7)
    model.fit(x_train, y_train)

    val_pred = model.predict_proba(x_val)[:, 1]
    test_pred = model.predict_proba(x_test)[:, 1]

    metrics = {
        "model_name": MODEL_NAME,
        "model_version": MODEL_VERSION,
        "feature_schema_version": ABUSE_FEATURE_SCHEMA_VERSION,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "dataset": "synthetic-v1",
        "n_train": len(train_df),
        "n_val": len(val_df),
        "n_test": len(test_df),
        "roc_auc_val": float(roc_auc_score(y_val, val_pred)),
        "pr_auc_val": float(average_precision_score(y_val, val_pred)),
        "roc_auc_test": float(roc_auc_score(y_test, test_pred)),
        "pr_auc_test": float(average_precision_score(y_test, test_pred)),
        "brier_score_test": float(brier_score_loss(y_test, test_pred)),
        "positive_rate": float(y_train.mean()),
    }

    artifact_dir = Path(settings.model_artifact_dir)
    artifact_dir.mkdir(parents=True, exist_ok=True)

    import joblib

    model_path = artifact_dir / f"{MODEL_NAME}-{MODEL_VERSION}.joblib"
    joblib.dump(model, model_path)

    metrics_path = artifact_dir / f"{MODEL_NAME}-{MODEL_VERSION}.metrics.json"
    metrics_path.write_text(json.dumps(metrics, indent=2))

    registry_path = artifact_dir / "registry.json"
    registry = json.loads(registry_path.read_text()) if registry_path.exists() else {}
    registry[MODEL_NAME] = {
        "active_version": MODEL_VERSION,
        "artifact_path": str(model_path),
        "metrics_path": str(metrics_path),
        "status": "active",
        "deployed_at": metrics["trained_at"],
    }
    registry_path.write_text(json.dumps(registry, indent=2))

    return metrics


if __name__ == "__main__":
    result = train()
    print(json.dumps(result, indent=2))
