// Domain 02 §38/§53-56: landing personalisation + experimentation +
// deterministic lead propensity scoring. All ML here starts from a
// deterministic rule baseline per spec — no invented "trained model"
// performance. `model_registry` already exists (Domain 01 migration
// 20260101000031); we only add rows to it, not a new table.
export async function up(knex) {
  await knex.schema.createTable('experiments', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('key').notNullable().unique();
    t.string('name').notNullable();
    t.text('hypothesis');
    t.enu('status', ['draft', 'running', 'paused', 'completed']).notNullable().defaultTo('draft');
    t.string('primary_metric').notNullable();
    t.jsonb('guardrail_metrics').notNullable().defaultTo('[]');
    t.timestamp('starts_at').nullable();
    t.timestamp('ends_at').nullable();
    t.timestamps(true, true);
  });

  await knex.schema.createTable('landing_variants', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('page_slug').notNullable(); // e.g. 'home'
    t.uuid('experiment_id').nullable().references('id').inTable('experiments').onDelete('SET NULL');
    t.string('variant_key').notNullable(); // e.g. 'control', 'professional_intent'
    t.enu('status', ['draft', 'active', 'archived']).notNullable().defaultTo('draft');
    t.jsonb('content_overrides').notNullable().defaultTo('{}'); // editor-approved copy only
    t.integer('traffic_weight').notNullable().defaultTo(100);
    t.timestamp('starts_at').nullable();
    t.timestamp('ends_at').nullable();
    t.timestamps(true, true);
    t.unique(['page_slug', 'variant_key']);
  });

  await knex.schema.createTable('experiment_exposures', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('experiment_id').nullable().references('id').inTable('experiments').onDelete('CASCADE');
    t.uuid('variant_id').nullable().references('id').inTable('landing_variants').onDelete('CASCADE');
    t.string('anonymous_session_id').notNullable();
    t.uuid('user_id').nullable();
    t.timestamp('occurred_at').notNullable().defaultTo(knex.fn.now());
  });
  await knex.schema.alterTable('experiment_exposures', (t) => {
    t.index(['anonymous_session_id']);
  });

  await knex.schema.createTable('experiment_conversions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('exposure_id').notNullable().references('id').inTable('experiment_exposures').onDelete('CASCADE');
    t.uuid('conversion_event_id').nullable().references('id').inTable('conversion_events').onDelete('SET NULL');
    t.timestamp('occurred_at').notNullable().defaultTo(knex.fn.now());
  });

  // Deterministic lead-propensity output, computed synchronously at lead
  // creation time (see marketing-leads service) — never blocks/denies signup,
  // purely informs sales follow-up prioritisation.
  await knex.schema.alterTable('marketing_leads', (t) => {
    t.integer('propensity_score').nullable(); // 0-100
    t.string('propensity_band').nullable(); // low | medium | high
    t.string('propensity_model_version').nullable();
    t.jsonb('propensity_reason_codes').notNullable().defaultTo('[]');
  });

  await knex.schema.createTable('ml_inference_log', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('model_name').notNullable();
    t.string('model_version').notNullable();
    t.string('feature_schema_version').notNullable().defaultTo('v1');
    t.string('surface').notNullable(); // e.g. 'lead_propensity', 'landing_personalisation'
    t.jsonb('score').notNullable().defaultTo('{}');
    t.string('selected_variant').nullable();
    t.jsonb('reason_codes').notNullable().defaultTo('[]');
    t.integer('latency_ms').nullable();
    t.timestamp('occurred_at').notNullable().defaultTo(knex.fn.now());
  });
  await knex.schema.alterTable('ml_inference_log', (t) => {
    t.index(['model_name', 'occurred_at']);
  });

  await knex.schema.createTable('content_topic_clusters', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('content_type').notNullable(); // resource_article | help_article
    t.uuid('content_id').notNullable();
    t.string('content_hash').notNullable();
    t.integer('cluster_id').notNullable();
    t.string('generated_label').nullable();
    t.float('confidence').nullable();
    t.string('model_name').notNullable();
    t.string('model_version').notNullable();
    t.string('embedding_model').notNullable();
    t.integer('cluster_version').notNullable();
    t.timestamps(true, true);
    t.unique(['content_type', 'content_id', 'cluster_version']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('content_topic_clusters');
  await knex.schema.dropTableIfExists('ml_inference_log');
  await knex.schema.alterTable('marketing_leads', (t) => {
    t.dropColumn('propensity_score');
    t.dropColumn('propensity_band');
    t.dropColumn('propensity_model_version');
    t.dropColumn('propensity_reason_codes');
  });
  await knex.schema.dropTableIfExists('experiment_conversions');
  await knex.schema.dropTableIfExists('experiment_exposures');
  await knex.schema.dropTableIfExists('landing_variants');
  await knex.schema.dropTableIfExists('experiments');
}
