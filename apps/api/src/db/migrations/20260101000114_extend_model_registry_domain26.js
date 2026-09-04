// Domain 26 (Machine Learning, Matching, Ranking & Intelligence) — foundation migration.
//
// `model_registry` (20260101000031) is already the canonical model-identity table used across
// domains — extend it with the columns the Domain 26 admin control plane needs (capability
// taxonomy, ownership, risk classification) rather than creating a second, competing registry.
//
// `ml_inference_log` (20260101000037) is already the real per-request inference log written to
// by feed/moderation/content-quality calls — extend it with the columns needed to build the
// Domain 26 Overview traffic/latency/environment views (entity reference, environment, fallback
// flag, request id for tracing) rather than creating a parallel `ml_predictions` table.
export async function up(knex) {
  await knex.schema.alterTable('model_registry', (t) => {
    t.string('capability').nullable(); // e.g. 'matching.candidate_job', 'ranking.job_search', 'fraud.signup_risk'
    t.string('domain').nullable(); // e.g. 'jobs', 'crm', 'gigs', 'trust_safety'
    t.string('owner_team').nullable();
    t.enu('risk_classification', ['low', 'medium', 'high', 'restricted']).notNullable().defaultTo('low');
    t.text('description').nullable();
    t.string('default_metric_name').nullable();
    t.uuid('champion_version_id').nullable(); // FK added in 20260101000115 once ml_model_versions exists
    t.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    t.index(['capability']);
    t.index(['domain']);
  });

  await knex.schema.alterTable('ml_inference_log', (t) => {
    t.string('environment').notNullable().defaultTo('production'); // development | staging | production
    t.string('entity_type').nullable();
    t.uuid('entity_id').nullable();
    t.boolean('fallback_used').notNullable().defaultTo(false);
    t.uuid('request_id').nullable();
    t.index(['entity_type', 'entity_id']);
    t.index(['environment', 'occurred_at']);
  });
}

export async function down(knex) {
  await knex.schema.alterTable('ml_inference_log', (t) => {
    t.dropColumn('environment');
    t.dropColumn('entity_type');
    t.dropColumn('entity_id');
    t.dropColumn('fallback_used');
    t.dropColumn('request_id');
  });

  await knex.schema.alterTable('model_registry', (t) => {
    t.dropColumn('capability');
    t.dropColumn('domain');
    t.dropColumn('owner_team');
    t.dropColumn('risk_classification');
    t.dropColumn('description');
    t.dropColumn('default_metric_name');
    t.dropColumn('champion_version_id');
    t.dropColumn('updated_at');
  });
}
