# Domain 05 training-pipeline groundwork (Phase 6)

Status: **groundwork only**. No model is trained or deployed to production
ranking/moderation/topic-classification as a result of this work. Everything
below is either (a) real code that runs against the real dev database today,
or (b) an honest description of what is still missing before a *learned*
model could responsibly replace today's rule-based heuristics.

## What real signal exists today

Phase 5 wired up real signal capture that nothing was consuming yet:

| Table | What it captures |
|---|---|
| `ml_inference_log` | Every real call from apps/api to apps/ml-service's `quality-score`, `moderation-screen`, and `topic-classify` endpoints — model name/version, the full output, and reason codes. |
| `feed_negative_feedback` | Real "not interested" / "hide author" / "hide topic" actions a user takes on the feed. |
| `post_metrics_daily` | Daily rollups of impressions/reactions/comments/shares/saves/clicks per post. |
| `content_moderation_actions` | The real admin decision trail (held / approved / removed / restricted) on posts, articles, comments. |
| `post_impression_viewers` | Which real users saw which real post, and when. |
| `post_reactions`, `post_comments`, `saved_items` | The underlying real engagement events. |

All of these are written to by real request paths (`apps/api/src/modules/posts/*`,
`apps/api/src/common/ml/*`) — none of it is seeded or synthetic.

**Current volume**: this dev database ships with no seed file that populates
`posts` (checked `apps/api/src/db/seeds/*` — the only Domain 05-adjacent seed
data comes from whatever an operator/QA session creates by hand through the
running app). So on a freshly-seeded dev DB, `export_dataset.py` will
correctly report **zero or a handful of rows** — that's the honest starting
point, not a bug in the export logic. During this phase's own verification,
a handful of real posts (with real reactions/comments/saves/moderation
outcomes) were created by driving the actual running API as a real user
end-to-end (see the phase report) specifically so the export script had
something non-trivial to run against; production traffic will be the real
source of volume once the feature ships.

## What `export_dataset.py` does

`python -m app.training.export_dataset [--out-dir DIR] [--fit-baseline]`

1. Connects to the same Postgres database as the rest of apps/ml-service
   (`app.core.database.engine` — no new connection logic).
2. Runs one real SQL query that joins `posts` against `ml_inference_log`
   (quality + moderation outputs, matched via the `objectId` recorded inside
   the jsonb `score` column — that table has no dedicated `object_id`
   column, see `apps/api/src/common/ml/mlInferenceLog.js`), `post_reactions`,
   `post_comments`, `saved_items`, `feed_negative_feedback`,
   `content_moderation_actions`, and `post_impression_viewers`.
3. Produces one row per post with:
   - **Features**: content length, media count/presence, topic-tag count,
     the author's post count prior to this one, hours since creation,
     the logged quality score/band/reason-code count, the logged moderation
     label/reason-code count, and distinct-viewer impression count.
   - **Labels** (real engagement outcomes, not proxies): `label_reacted`,
     `label_commented`, `label_saved`, `label_hidden` (real "not interested"
     feedback tied to that post), `label_reported` (a real
     held/removed/restricted moderation action), and a convenience
     `label_engaged` (reacted OR commented OR saved).
4. Writes the result to a timestamped CSV under `app/training/output/` and
   prints the row count, full column schema, and label prevalence — so a
   `0` result is visible and explained, never silently swallowed.
5. With `--fit-baseline`, additionally attempts to fit a trivial
   scikit-learn `LogisticRegression` on the exported feature columns against
   `label_engaged`, purely to exercise the export → training wiring
   end-to-end. It refuses to run (and says why) below `MIN_ROWS_FOR_BASELINE`
   rows or when the target label has only one class present in the export —
   it never fabricates a metric to paper over insufficient data. Any metric
   it does print is explicitly labeled as a pipeline-validation artifact
   computed on a tiny, non-representative dev dataset, and is **not** loaded
   by, or wired into, the actual feed ranker, moderation screen, or topic
   classifier.

**Known limitation**: `topic-classify` calls are logged against
`objectType: 'draft'` with `objectId: null` (see
`apps/api/src/modules/posts/posts.controller.js`) because topic suggestions
happen before a post exists — so today's export cannot join a logged topic
suggestion back to the post it was eventually attached to. Fixing that would
need `posts.controller.js`'s topic-suggest call to pass a client-generated
draft ID that later gets recorded on the post, which is a real (but
separate) product change, not something this export script can paper over.

## What today's "models" actually are

`quality-score` (`quality-heuristic-v1`), `topic-classify`
(`topic-keyword-overlap-v1`), and `moderation-screen`
(`moderation-rules-v1`) are all **deterministic, rule-based heuristics** —
there has never been a labelled training dataset for any of them. They are
registered in `model_registry` (see
`apps/api/src/db/seeds/19_domain05_model_registry.js`) with
`model_type: 'deterministic'` and `status: 'active'` so the registry
reflects that reality rather than implying a trained model backs them.

The one exception is `feed_ranker` (`apps/ml-service/app/ml/models/online_feed_ranker.py`),
which already does real online learning — an untrained `SGDClassifier` that
calls `partial_fit` on every real labeled interaction and only starts
serving (`predict_score` returning non-`None`) once it has seen at least one
positive and one negative example. It is registered here too
(`model_type: 'online'`, `status: 'shadow'` until real traffic warms it up)
for cross-domain visibility, but its own file-based `registry.json` under
`model_artifact_dir` remains the source of truth for its live ready/shadow
state.

## What it would take to productionize a real learned model here

This export script and the toy baseline prove the wiring works. They are
**not** a replacement for the heuristics yet. To get from here to a
responsibly deployed learned model for, say, `quality-score` or
`moderation-screen`:

1. **Volume**: real production traffic generating hundreds to low-thousands
   of labelled examples per class at minimum — a few dozen dev-session rows
   (what this phase could produce) cannot support a meaningful train/test
   split, let alone generalize.
2. **A labeling/evaluation strategy**: today's "labels" are behavioral
   proxies (reacted/commented/saved/hidden/reported). That's reasonable for
   an engagement-prediction ranker, but *not* a substitute for actual human
   moderation review labels if the goal is a trained toxicity/spam
   classifier — `content_moderation_actions` gives real admin decisions, but
   there are far too few of them yet to train on, and admin decisions
   trained on the current rule-based screen's own flags would just learn to
   reproduce the rules, not improve on them (a circularity problem to design
   around, e.g. by sampling content the rules did *not* flag for review too).
3. **An offline evaluation harness**: held-out temporal splits (train on
   older posts, evaluate on newer ones — not a random split, since post
   ranking is sequential), calibration checks, and slicing metrics by
   content type/author-history bucket, comparable to what
   `train_risk_model.py` / `train_abuse_model.py` already do for Domain 03
   (though those still train on synthetic data — same next step applies
   there).
4. **A deployment/rollback process via `model_registry`**: a new learned
   version would land with `status: 'shadow'` and `training_dataset_version`
   pointing at a specific export run, get compared against the live
   deterministic heuristic on real traffic (shadow scoring, not yet serving
   decisions), and only flip to `status: 'active'` (with `deployed_at` set
   and the previous active row moved to `retired`/`retired_at`) once its
   offline + shadow metrics justify it — with the deterministic heuristic
   kept as the documented rollback target, exactly as `online_feed_ranker.py`
   already does for its own fallback-to-deterministic behavior.

None of the above exists yet. This phase's contribution is the export
pipeline and the registry bookkeeping to make that next step tractable —
not the trained model itself.
