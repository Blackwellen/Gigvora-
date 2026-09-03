// Domain 05 (Live Feed, Posts & Social Publishing) — Phase 6. Registers the
// three real ML-service capabilities that already run in production request
// paths today (apps/ml-service/app/services/{content_quality,topic_classifier,
// moderation}_service.py, called via apps/api's feedRankerClient.js /
// moderationClient.js and logged to `ml_inference_log` by mlInferenceLog.js).
//
// All three are deterministic RULE-BASED heuristics, not learned models —
// there is no offline training pipeline behind them yet (see
// apps/ml-service/app/training/README.md for the honest roadmap to change
// that). Registering them with status='active' and model_type='deterministic'
// keeps this registry an accurate reflection of what's actually deployed,
// matching the convention 13_domain02_model_registry.js already established
// for the same reason.
//
// A fourth row documents `feed_ranker` (online_feed_ranker.py) — the one
// place in this domain that already does real online learning (an untrained
// sklearn SGDClassifier that partial_fit's on every real interaction) — as
// 'shadow' by default since it only starts serving once it has seen both
// classes at least once (see is_ready() in that module); flip to 'active'
// once real traffic has warmed it up.
export async function seed(knex) {
  const rows = [
    {
      model_name: 'quality-score',
      model_version: 'quality-heuristic-v1',
      model_type: 'deterministic',
      feature_schema_version: 'v1',
      training_dataset_version: null,
      metrics: {
        note: 'Rule-based blend of content length, spam-pattern, near-duplicate, media-presence, and (when impression data exists) engagement-ratio components. No labelled quality dataset exists to train a classifier against — see apps/ml-service/app/training/README.md.',
      },
      artifact_ref: 'apps/ml-service/app/services/content_quality_service.py',
      status: 'active',
    },
    {
      model_name: 'topic-classify',
      model_version: 'topic-keyword-overlap-v1',
      model_type: 'deterministic',
      feature_schema_version: 'v1',
      training_dataset_version: null,
      metrics: {
        note: 'Deterministic keyword-overlap match against the real `topics` table — no embedding index or trained classifier. Explainable by construction (the matched keywords are the whole model).',
      },
      artifact_ref: 'apps/ml-service/app/services/topic_classifier_service.py',
      status: 'active',
    },
    {
      model_name: 'moderation-screen',
      model_version: 'moderation-rules-v1',
      model_type: 'deterministic',
      feature_schema_version: 'v1',
      training_dataset_version: null,
      metrics: {
        note: 'Narrow, high-precision blocklist/pattern/rate-limit rules, not a trained toxicity/spam classifier — no labelled moderation-outcome dataset exists yet. See content_moderation_actions for the real admin-decision audit trail this could eventually be trained against.',
      },
      artifact_ref: 'apps/ml-service/app/services/moderation_service.py',
      status: 'active',
    },
    {
      model_name: 'feed_ranker',
      model_version: 'v1-online',
      model_type: 'online',
      feature_schema_version: 'v1',
      training_dataset_version: null,
      metrics: {
        note: 'Online sklearn SGDClassifier (log-loss) updated via partial_fit on every real reaction/comment/save/share as it happens (apps/ml-service/app/ml/models/online_feed_ranker.py). Serves no prediction (predict_score returns None, callers fall back to the deterministic ranker) until it has seen at least one positive and one negative example. Its own file-based registry.json under model_artifact_dir tracks live ready/shadow state; this row documents its existence here for cross-domain visibility only.',
      },
      artifact_ref: 'apps/ml-service/app/ml/models/online_feed_ranker.py',
      status: 'shadow',
    },
  ];

  for (const row of rows) {
    const existing = await knex('model_registry').where({ model_name: row.model_name, model_version: row.model_version }).first();
    if (existing) continue;
    await knex('model_registry').insert({
      ...row,
      metrics: JSON.stringify(row.metrics),
      deployed_at: row.status === 'active' ? knex.fn.now() : null,
    });
  }
}
