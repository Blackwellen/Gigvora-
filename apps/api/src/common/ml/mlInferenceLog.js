import { db } from '../../db/connection.js';

/**
 * Data-collection prerequisite for a future training pipeline (Domain 05
 * Phase 5 gap #5) — NOT the pipeline itself, and not a replacement for
 * feed_negative_feedback / post_metrics_daily / content_moderation_actions,
 * which already capture engagement-side signals. This is the ML-output
 * side: every real call to apps/ml-service's moderation/quality/topic
 * services gets its input reference and output persisted so it can
 * eventually be joined against outcomes.
 *
 * Reuses the `ml_inference_log` table already created by
 * 20260101000037_create_experimentation_and_personalization.js and already
 * written to by modules/personalization/personalization.service.js and
 * modules/public-content/public-content.service.js — a second table would
 * have been pure duplication. That table has no object_type/object_id
 * columns (it was built for the surface/variant shape of personalization
 * logging), so the content-moderation object reference travels inside the
 * jsonb `score` column instead of as a first-class column — additive, no
 * migration needed.
 *
 * Best-effort — logging must never break the request that triggered the ML
 * call, matching moderationClient.js's fail-open contract.
 */
export async function logMlInference({ objectType, objectId = null, modelName, modelVersion = null, actorId = null, output }) {
  if (!output) return; // null output means the ML call failed/timed out — nothing real to log
  try {
    await db('ml_inference_log').insert({
      model_name: modelName,
      model_version: modelVersion || 'unknown',
      surface: `content_moderation.${objectType}`,
      score: JSON.stringify({ ...output, objectType, objectId, actorId }),
      selected_variant: output.label || null,
      reason_codes: JSON.stringify(output.reason_codes || []),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[ml_inference_log] failed to record inference', err.message);
  }
}
