import { db } from '../../db/connection.js';

const MODEL_NAME = 'landing_personalisation_ranker';
const MODEL_VERSION = 'v0-deterministic';

/**
 * Deterministic landing-page personalisation (Domain 02 spec §53-54).
 * Selects among editor-approved `landing_variants` rows only — never
 * generates new copy. Explicit intent (from the URL) always wins; there is
 * no learned ranking yet, and none is needed for a rule this simple.
 */
export async function selectLandingVariant({ pageSlug, intent, anonymousSessionId, userId }) {
  const startedAt = Date.now();
  const candidates = await db('landing_variants').where({ page_slug: pageSlug, status: 'active' });

  let selected = null;
  let reasonCode = 'no_active_variants';

  if (intent) {
    selected = candidates.find((v) => v.variant_key === intent) || null;
    if (selected) reasonCode = `explicit_intent:${intent}`;
  }
  if (!selected) {
    selected = candidates.find((v) => v.variant_key === 'control') || null;
    if (selected) reasonCode = 'default_control';
  }

  if (selected && anonymousSessionId) {
    await db('experiment_exposures').insert({
      experiment_id: selected.experiment_id,
      variant_id: selected.id,
      anonymous_session_id: anonymousSessionId,
      user_id: userId || null,
    });
  }

  await db('ml_inference_log').insert({
    model_name: MODEL_NAME,
    model_version: MODEL_VERSION,
    surface: 'landing_personalisation',
    score: JSON.stringify({ pageSlug, intent: intent || null }),
    selected_variant: selected?.variant_key || null,
    reason_codes: JSON.stringify([reasonCode]),
    latency_ms: Date.now() - startedAt,
  });

  if (!selected) return null;

  return {
    variantKey: selected.variant_key,
    contentOverrides: selected.content_overrides,
  };
}
