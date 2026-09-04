// Domain 26 — Feature Store catalogue. ml_feature_definitions is the discoverable, versioned
// catalogue entry per feature; ml_feature_model_dependencies is the lineage join (which
// production model versions consume which features) that powers "before you deprecate this
// feature, N production models depend on it" checks.
export async function up(knex) {
  await knex.schema.createTable('ml_feature_definitions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('feature_key').notNullable().unique(); // e.g. candidate_years_experience
    t.string('display_name').notNullable();
    t.text('description').nullable();
    t.string('entity_type').notNullable(); // candidate | job | candidate_job_pair | lead | account | opportunity ...
    t.enu('data_type', ['boolean', 'integer', 'float', 'string', 'category', 'timestamp', 'duration', 'count', 'vector_reference', 'json'])
      .notNullable();
    t.text('transformation').nullable();
    t.string('source_reference').nullable();
    t.string('owner').nullable();
    t.string('domain').nullable();
    t.string('version').notNullable().defaultTo('v1');
    t.integer('freshness_sla_minutes').notNullable().defaultTo(60);
    t.boolean('online_available').notNullable().defaultTo(false);
    t.boolean('offline_available').notNullable().defaultTo(true);
    t.enu('status', ['healthy', 'delayed', 'stale', 'broken', 'unknown']).notNullable().defaultTo('unknown');
    t.timestamp('last_computed_at').nullable();
    t.decimal('null_rate', 5, 4).nullable();
    t.enu('pii_classification', ['none', 'internal', 'confidential', 'pii', 'sensitive_restricted']).notNullable().defaultTo('internal');
    t.enu('lifecycle', ['active', 'deprecated', 'sunsetting', 'archived']).notNullable().defaultTo('active');
    t.timestamps(true, true);
    t.index(['entity_type']);
    t.index(['status']);
  });

  await knex.schema.createTable('ml_feature_model_dependencies', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('feature_definition_id').notNullable().references('id').inTable('ml_feature_definitions').onDelete('CASCADE');
    t.uuid('model_registry_id').notNullable().references('id').inTable('model_registry').onDelete('CASCADE');
    t.timestamps(true, true);
    t.unique(['feature_definition_id', 'model_registry_id']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('ml_feature_model_dependencies');
  await knex.schema.dropTableIfExists('ml_feature_definitions');
}
