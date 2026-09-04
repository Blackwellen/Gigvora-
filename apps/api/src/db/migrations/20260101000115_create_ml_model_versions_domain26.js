// Domain 26 — version/lineage record for each model_registry entry. model_registry rows are the
// stable *identity* (capability, owner, risk class); ml_model_versions rows are the immutable,
// promotable *artifacts* of that identity, matching the lifecycle in the spec (draft → training →
// evaluating → candidate → approved → staging → production → deprecated → archived → failed).
export async function up(knex) {
  await knex.schema.createTable('ml_model_versions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('model_registry_id').notNullable().references('id').inTable('model_registry').onDelete('CASCADE');
    t.string('version').notNullable();
    t.enu('stage', [
      'draft',
      'training',
      'evaluating',
      'candidate',
      'approved',
      'staging',
      'production',
      'deprecated',
      'archived',
      'failed',
    ])
      .notNullable()
      .defaultTo('draft');
    t.string('framework').nullable(); // scikit-learn | xgboost | pytorch | rule-based | llm-structured ...
    t.string('algorithm_family').nullable();
    t.string('artifact_uri').nullable();
    t.string('artifact_hash').nullable();
    t.string('training_job_id').nullable();
    t.uuid('training_dataset_id').nullable(); // FK added once ml_datasets exists (20260101000116)
    t.string('feature_set_version').nullable();
    t.jsonb('hyperparameters').notNullable().defaultTo('{}');
    t.string('training_code_revision').nullable();
    t.timestamp('trained_at').nullable();
    t.uuid('created_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.string('primary_metric_name').nullable();
    t.decimal('primary_metric_value', 10, 6).nullable();
    t.jsonb('metrics').notNullable().defaultTo('{}');
    t.jsonb('metadata').notNullable().defaultTo('{}');
    t.string('approval_status').notNullable().defaultTo('not_required'); // not_required | pending | approved | rejected
    t.uuid('approved_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('approved_at').nullable();
    t.timestamps(true, true);
    t.unique(['model_registry_id', 'version']);
    t.index(['model_registry_id', 'stage']);
  });

  await knex.schema.alterTable('model_registry', (t) => {
    t.foreign('champion_version_id').references('id').inTable('ml_model_versions').onDelete('SET NULL');
  });
}

export async function down(knex) {
  await knex.schema.alterTable('model_registry', (t) => {
    t.dropForeign(['champion_version_id']);
  });
  await knex.schema.dropTableIfExists('ml_model_versions');
}
