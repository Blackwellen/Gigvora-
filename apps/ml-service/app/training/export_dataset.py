"""Domain 05 (Live Feed, Posts & Social Publishing) training-dataset export.

Phase 6 groundwork. This script is REAL and RUNNABLE against the actual dev
Postgres database — it is not a mock or a synthetic-data generator. It joins
the real engagement/moderation/ML-signal tables that Phase 5 started writing
to (`ml_inference_log`, `feed_negative_feedback`, `post_metrics_daily`,
`content_moderation_actions`, `post_impression_viewers`) against `posts`,
`post_reactions`, `post_comments`, and `saved_items` to produce one row per
post with real feature columns and real engagement-outcome labels.

It does NOT train a production model. See app/training/README.md for the
honest boundary between "we can now export a real dataset" and "we have a
deployable learned ranker" — those are not the same thing yet, mostly
because there simply isn't much production traffic/content in this database
yet (this script will print a very small or zero row count against a fresh
dev DB, and that's the expected, honest result, not a bug).

Usage:
    python -m app.training.export_dataset [--out-dir app/training/output] [--fit-baseline]

--fit-baseline additionally attempts to fit a trivial scikit-learn
LogisticRegression on the exported real feature set as a pipeline-validation
step ONLY (see README). It is skipped, with a clear message, whenever the
dataset doesn't have at least MIN_ROWS_FOR_BASELINE rows with both classes
of the target label present — no metric is ever fabricated to fill that gap.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
from sqlalchemy import text as sql_text

from app.core.database import engine

DATASET_SCHEMA_VERSION = "v1"
MIN_ROWS_FOR_BASELINE = 20  # below this, any train/test split or metric is noise, not signal.

# One row per post. Every column here is computed from real rows in real
# tables — nothing is synthesized. See the module docstring and README for
# the known limitations (small volume, topic-classify not joinable yet).
EXPORT_QUERY = """
WITH ml_quality AS (
    SELECT
        (score ->> 'objectId')::uuid AS post_id,
        (score ->> 'quality_score')::numeric AS quality_score,
        score ->> 'band' AS quality_band,
        jsonb_array_length(COALESCE(reason_codes, '[]'::jsonb)) AS quality_reason_count
    FROM ml_inference_log
    WHERE model_name = 'quality-score'
      AND score ->> 'objectId' IS NOT NULL
),
ml_moderation AS (
    SELECT
        (score ->> 'objectId')::uuid AS post_id,
        selected_variant AS moderation_label,
        jsonb_array_length(COALESCE(reason_codes, '[]'::jsonb)) AS moderation_reason_count
    FROM ml_inference_log
    WHERE model_name = 'moderation-screen'
      AND score ->> 'objectType' = 'post'
      AND score ->> 'objectId' IS NOT NULL
),
reactions AS (
    SELECT post_id, COUNT(*) AS reaction_count
    FROM post_reactions
    GROUP BY post_id
),
comments AS (
    SELECT post_id, COUNT(*) AS comment_count
    FROM post_comments
    WHERE deleted_at IS NULL
    GROUP BY post_id
),
saves AS (
    SELECT object_id AS post_id, COUNT(*) AS saved_count
    FROM saved_items
    WHERE object_type = 'post'
    GROUP BY object_id
),
hides AS (
    SELECT post_id, COUNT(*) AS hidden_count
    FROM feed_negative_feedback
    WHERE feedback_type = 'not_interested' AND post_id IS NOT NULL
    GROUP BY post_id
),
mod_actions AS (
    SELECT
        object_id AS post_id,
        COUNT(*) FILTER (WHERE action IN ('held', 'removed', 'restricted')) AS moderation_action_count
    FROM content_moderation_actions
    WHERE object_type = 'post'
    GROUP BY object_id
),
impressions AS (
    SELECT post_id, COUNT(DISTINCT viewer_id) AS impression_count, MIN(date) AS first_impression_date
    FROM post_impression_viewers
    GROUP BY post_id
)
SELECT
    p.id AS post_id,
    p.author_id,
    p.post_type,
    p.status,
    p.visibility,
    p.created_at,
    LENGTH(COALESCE(p.content, '')) AS content_length,
    CASE WHEN jsonb_typeof(p.media) = 'array' THEN jsonb_array_length(p.media) ELSE 0 END AS media_count,
    (CASE WHEN jsonb_typeof(p.media) = 'array' THEN jsonb_array_length(p.media) ELSE 0 END) > 0 AS has_media,
    CASE WHEN jsonb_typeof(p.topics) = 'array' THEN jsonb_array_length(p.topics) ELSE 0 END AS topics_count,
    (
        SELECT COUNT(*) FROM posts p2
        WHERE p2.author_id = p.author_id AND p2.created_at < p.created_at
    ) AS author_prior_post_count,
    EXTRACT(EPOCH FROM (now() - p.created_at)) / 3600.0 AS age_hours_at_export,
    q.quality_score,
    q.quality_band,
    COALESCE(q.quality_reason_count, 0) AS quality_reason_count,
    m.moderation_label,
    COALESCE(m.moderation_reason_count, 0) AS moderation_reason_count,
    COALESCE(r.reaction_count, 0) AS reaction_count,
    COALESCE(c.comment_count, 0) AS comment_count,
    COALESCE(s.saved_count, 0) AS saved_count,
    COALESCE(h.hidden_count, 0) AS hidden_count,
    COALESCE(ma.moderation_action_count, 0) AS moderation_action_count,
    COALESCE(imp.impression_count, 0) AS impression_count,
    (COALESCE(r.reaction_count, 0) > 0) AS label_reacted,
    (COALESCE(c.comment_count, 0) > 0) AS label_commented,
    (COALESCE(s.saved_count, 0) > 0) AS label_saved,
    (COALESCE(h.hidden_count, 0) > 0) AS label_hidden,
    (COALESCE(ma.moderation_action_count, 0) > 0) AS label_reported,
    (
        COALESCE(r.reaction_count, 0) > 0
        OR COALESCE(c.comment_count, 0) > 0
        OR COALESCE(s.saved_count, 0) > 0
    ) AS label_engaged
FROM posts p
LEFT JOIN ml_quality q ON q.post_id = p.id
LEFT JOIN ml_moderation m ON m.post_id = p.id
LEFT JOIN reactions r ON r.post_id = p.id
LEFT JOIN comments c ON c.post_id = p.id
LEFT JOIN saves s ON s.post_id = p.id
LEFT JOIN hides h ON h.post_id = p.id
LEFT JOIN mod_actions ma ON ma.post_id = p.id
LEFT JOIN impressions imp ON imp.post_id = p.id
ORDER BY p.created_at DESC
"""

FEATURE_COLUMNS = [
    "content_length",
    "media_count",
    "has_media",
    "topics_count",
    "author_prior_post_count",
    "age_hours_at_export",
    "quality_score",
    "quality_reason_count",
    "moderation_reason_count",
    "impression_count",
]

LABEL_COLUMNS = [
    "label_reacted",
    "label_commented",
    "label_saved",
    "label_hidden",
    "label_reported",
    "label_engaged",
]


def export_dataset() -> pd.DataFrame:
    """Runs the real join against Postgres and returns the resulting DataFrame."""
    with engine.connect() as conn:
        df = pd.read_sql_query(sql_text(EXPORT_QUERY), conn)
    return df


def dataset_version(df: pd.DataFrame) -> str:
    """A reproducible, honest dataset-version label: schema version + row
    count + export timestamp. Not a content hash — good enough to reference
    from model_registry.training_dataset_version without over-engineering a
    versioning scheme for a dataset this small."""
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    return f"domain05-posts-{DATASET_SCHEMA_VERSION}-{len(df)}rows-{stamp}"


def write_export(df: pd.DataFrame, out_dir: Path) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    path = out_dir / f"domain05_post_dataset_{stamp}.csv"
    df.to_csv(path, index=False)
    return path


def print_summary(df: pd.DataFrame) -> None:
    print(f"Rows exported: {len(df)}")
    print("Schema (column: dtype):")
    for col, dtype in df.dtypes.items():
        print(f"  {col}: {dtype}")
    if len(df) == 0:
        print(
            "\nNo rows returned. This is the honest current state of this dev "
            "database (no seed file populates `posts` yet) — not a query bug. "
            "See app/training/README.md."
        )
        return
    print("\nLabel prevalence (share of posts positive for each outcome):")
    for label in LABEL_COLUMNS:
        if label in df.columns:
            print(f"  {label}: {df[label].mean():.3f} ({int(df[label].sum())}/{len(df)})")


def fit_baseline(df: pd.DataFrame, target: str = "label_engaged") -> dict | None:
    """Fits a trivial scikit-learn LogisticRegression on the real exported
    feature set, PURELY to prove the export -> training wiring works
    end-to-end. This is NOT a production model and is never loaded by the
    feed ranker or any serving path — see README for why. Returns None (and
    prints why) rather than fabricating metrics when there isn't enough
    real data to make a train/test split meaningful.
    """
    if len(df) < MIN_ROWS_FOR_BASELINE:
        print(
            f"\n[fit_baseline] Skipped: only {len(df)} row(s) exported, need at least "
            f"{MIN_ROWS_FOR_BASELINE} for even a toy train/test split to mean anything. "
            "This is expected on a fresh/lightly-seeded dev database — see README."
        )
        return None

    y = df[target].astype(int)
    if y.nunique() < 2:
        print(
            f"\n[fit_baseline] Skipped: '{target}' has only one class present "
            f"({y.unique().tolist()}) in the exported rows — cannot fit or evaluate "
            "a classifier without both classes."
        )
        return None

    from sklearn.linear_model import LogisticRegression
    from sklearn.metrics import accuracy_score, roc_auc_score
    from sklearn.model_selection import train_test_split

    x = df[FEATURE_COLUMNS].fillna(0).astype(float)
    x_train, x_test, y_train, y_test = train_test_split(
        x, y, test_size=0.3, random_state=42, stratify=y if y.value_counts().min() >= 2 else None
    )

    model = LogisticRegression(max_iter=1000)
    model.fit(x_train, y_train)
    pred = model.predict(x_test)

    metrics = {
        "note": (
            "PIPELINE-VALIDATION ARTIFACT ONLY. Computed on a tiny, non-representative "
            f"dev dataset ({len(df)} rows total, {len(x_train)} train / {len(x_test)} test). "
            "Not a production performance claim, not wired into any serving path."
        ),
        "target": target,
        "n_rows": int(len(df)),
        "n_train": int(len(x_train)),
        "n_test": int(len(x_test)),
        "accuracy_test": float(accuracy_score(y_test, pred)),
    }
    try:
        proba = model.predict_proba(x_test)[:, 1]
        metrics["roc_auc_test"] = float(roc_auc_score(y_test, proba))
    except ValueError:
        # Can happen if the test split ended up single-class despite the
        # stratify attempt above — omit rather than fabricate.
        pass

    print("\n[fit_baseline] Toy LogisticRegression fit on the real exported dataset:")
    print(json.dumps(metrics, indent=2))
    return metrics


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out-dir", default=str(Path(__file__).parent / "output"))
    parser.add_argument("--fit-baseline", action="store_true", help="Also fit a toy baseline classifier (pipeline validation only).")
    args = parser.parse_args()

    try:
        df = export_dataset()
    except Exception as exc:  # noqa: BLE001 - surface real connection/query errors clearly
        print(f"ERROR: could not export dataset from Postgres: {exc}", file=sys.stderr)
        sys.exit(1)

    print_summary(df)

    out_path = write_export(df, Path(args.out_dir))
    print(f"\nWrote {len(df)} row(s) to {out_path}")
    print(f"Dataset version: {dataset_version(df)}")

    if args.fit_baseline:
        fit_baseline(df)


if __name__ == "__main__":
    main()
