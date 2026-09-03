"""Trains the Domain 03 authentication risk model (Model A).

IMPORTANT: the training data generated here is SYNTHETIC. It encodes the deterministic
relationships the model is meant to learn (more failed attempts / unknown device / unseen
network -> higher takeover risk) so the pipeline, calibration and metrics reporting are real
and exercised end-to-end, but the resulting metrics are NOT a measurement of real-world
fraud-detection performance. Retrain on labelled production data (auth_attempts joined with
confirmed security_alert outcomes) before relying on this for anything but a safe baseline.

Run with: python -m app.ml.training.train_risk_model
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.calibration import calibration_curve
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import average_precision_score, brier_score_loss, roc_auc_score

from app.core.config import get_settings
from app.ml.pipelines.features import AUTHENTICATION_FEATURES, FEATURE_SCHEMA_VERSION

MODEL_NAME = "auth-risk-hgb"
MODEL_VERSION = "1.0.0"
RNG = np.random.default_rng(42)


def _synthesize(n: int, start: datetime) -> pd.DataFrame:
    rows = []
    for i in range(n):
        account_age_days = max(0, RNG.normal(400, 300))
        successful_7d = RNG.poisson(3)
        failed_5m = RNG.poisson(0.3)
        failed_1h = failed_5m + RNG.poisson(0.5)
        failed_24h = failed_1h + RNG.poisson(1)
        resets_30d = RNG.poisson(0.1)
        recovery_30d = RNG.poisson(0.05)
        mfa_enabled = RNG.random() < 0.35
        passkey_available = RNG.random() < 0.15
        known_device = RNG.random() < 0.7
        trusted_device = known_device and RNG.random() < 0.6
        ip_seen_before = RNG.random() < 0.65
        country_seen_before = RNG.random() < 0.9
        hour_deviation = abs(RNG.normal(0, 3))
        impossible_travel = max(0, RNG.normal(0, 1) if RNG.random() < 0.05 else 0)

        # Ground-truth risk signal used only to LABEL synthetic training rows.
        risk_signal = (
            0.9 * failed_5m
            + 0.4 * failed_1h
            + 0.15 * failed_24h
            + 0.6 * recovery_30d
            + 1.5 * impossible_travel
            + (1.2 if not known_device else 0)
            + (0.8 if not ip_seen_before else 0)
            + (0.6 if not country_seen_before else 0)
            + (0.5 if hour_deviation > 6 else 0)
            - (0.5 if mfa_enabled else 0)
            - (0.3 if trusted_device else 0)
        )
        probability = 1 / (1 + np.exp(-(risk_signal - 2.2)))
        label = RNG.random() < probability

        rows.append(
            {
                "account_age_days": account_age_days,
                "successful_signins_7d": successful_7d,
                "failed_signins_5m": failed_5m,
                "failed_signins_1h": failed_1h,
                "failed_signins_24h": failed_24h,
                "password_resets_30d": resets_30d,
                "recovery_attempts_30d": recovery_30d,
                "mfa_enabled": mfa_enabled,
                "passkey_available": passkey_available,
                "known_device": known_device,
                "trusted_device": trusted_device,
                "ip_seen_before": ip_seen_before,
                "country_seen_before": country_seen_before,
                "login_hour_deviation": hour_deviation,
                "impossible_travel_score": impossible_travel,
                "label": int(label),
                "event_time": start + timedelta(minutes=i),
            }
        )
    return pd.DataFrame(rows)


def train() -> dict:
    settings = get_settings()
    start = datetime(2026, 1, 1, tzinfo=timezone.utc)
    df = _synthesize(20000, start)

    # Time-based split: earliest 70% train, next 15% validation, latest 15% test.
    df = df.sort_values("event_time").reset_index(drop=True)
    n = len(df)
    train_df = df.iloc[: int(n * 0.7)]
    val_df = df.iloc[int(n * 0.7) : int(n * 0.85)]
    test_df = df.iloc[int(n * 0.85) :]

    x_train = train_df[AUTHENTICATION_FEATURES].astype(float)
    y_train = train_df["label"]
    x_val = val_df[AUTHENTICATION_FEATURES].astype(float)
    y_val = val_df["label"]
    x_test = test_df[AUTHENTICATION_FEATURES].astype(float)
    y_test = test_df["label"]

    model = HistGradientBoostingClassifier(max_depth=4, learning_rate=0.08, max_iter=150, random_state=42)
    model.fit(x_train, y_train)

    val_pred = model.predict_proba(x_val)[:, 1]
    test_pred = model.predict_proba(x_test)[:, 1]

    fraction_of_positives, mean_predicted_value = calibration_curve(y_test, test_pred, n_bins=10, strategy="quantile")

    metrics = {
        "model_name": MODEL_NAME,
        "model_version": MODEL_VERSION,
        "feature_schema_version": FEATURE_SCHEMA_VERSION,
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
        "calibration_curve": {
            "fraction_of_positives": fraction_of_positives.tolist(),
            "mean_predicted_value": mean_predicted_value.tolist(),
        },
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
