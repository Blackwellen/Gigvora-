// Domain 04 §56/§58/§60/§66: register the deterministic-first model seams
// used by onboarding/imports so provenance on import_field_mappings /
// import_dedupe_matches / recommendations is honest. All start as
// model_type 'deterministic' and 'active' — no trained model exists yet;
// swapping in a learned model later is a model_registry row update, not a
// schema change.
const MODELS = [
  { model_name: 'onboarding_next_step_ranker', model_version: 'rule-based-v1' },
  { model_name: 'profile_dedupe', model_version: 'rule-based-v1' },
  { model_name: 'company_dedupe', model_version: 'rule-based-v1' },
  { model_name: 'contact_dedupe', model_version: 'rule-based-v1' },
  { model_name: 'cv_entity_extractor', model_version: 'rule-based-v1' },
  { model_name: 'import_field_mapper', model_version: 'rule-based-v1' },
];

export async function up(knex) {
  const rows = MODELS.map((m) => ({
    ...m,
    model_type: 'deterministic',
    feature_schema_version: 'v1',
    training_dataset_version: null,
    metrics: JSON.stringify({}),
    artifact_ref: null,
    status: 'active',
    deployed_at: knex.fn.now(),
  }));
  await knex('model_registry').insert(rows).onConflict(['model_name', 'model_version']).ignore();
}

export async function down(knex) {
  await knex('model_registry')
    .whereIn(
      'model_name',
      MODELS.map((m) => m.model_name)
    )
    .andWhere('model_version', 'rule-based-v1')
    .del();
}
