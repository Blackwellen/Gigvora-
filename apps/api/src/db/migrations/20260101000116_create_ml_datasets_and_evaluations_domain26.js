// Domain 26 — evaluation datasets and evaluation runs. Datasets are immutable-by-version records
// of what was used to train/evaluate a model version; evaluations are the pass/warning/fail
// verdicts that gate promotion (enforced server-side in intelligence.service.js).
export async function up(knex) {
  await knex.schema.createTable('ml_datasets', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('name').notNullable();
    t.text('purpose').nullable();
    t.string('domain').nullable();
    t.string('version').notNullable();
    t.string('storage_reference').nullable();
    t.string('schema_version').notNullable().defaultTo('v1');
    t.uuid('created_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.enu('approval_status', ['pending', 'approved', 'rejected']).notNullable().defaultTo('pending');
    t.integer('row_count').nullable();
    t.timestamp('time_window_start').nullable();
    t.timestamp('time_window_end').nullable();
    t.string('label_source').nullable();
    t.string('sampling_method').nullable();
    t.enu('pii_classification', ['none', 'internal', 'confidential', 'pii', 'sensitive_restricted']).notNullable().defaultTo('internal');
    t.string('retention_policy').nullable();
    t.string('checksum').nullable();
    t.timestamps(true, true);
    t.unique(['name', 'version']);
  });

  await knex.schema.alterTable('ml_model_versions', (t) => {
    t.foreign('training_dataset_id').references('id').inTable('ml_datasets').onDelete('SET NULL');
  });

  await knex.schema.createTable('ml_evaluations', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('model_registry_id').notNullable().references('id').inTable('model_registry').onDelete('CASCADE');
    t.uuid('model_version_id').notNullable().references('id').inTable('ml_model_versions').onDelete('CASCADE');
    t.uuid('dataset_id').nullable().references('id').inTable('ml_datasets').onDelete('SET NULL');
    t.enu('evaluation_type', ['classification', 'ranking', 'recommendation', 'regression', 'parsing', 'embedding'])
      .notNullable();
    t.jsonb('metrics').notNullable().defaultTo('{}'); // { ndcg_at_10: 0.87, mrr: 0.41, ... } per-type shape
    t.uuid('baseline_version_id').nullable().references('id').inTable('ml_model_versions').onDelete('SET NULL');
    t.jsonb('delta').notNullable().defaultTo('{}');
    t.jsonb('segment_metrics').notNullable().defaultTo('{}');
    t.enu('decision', ['pass', 'warning', 'fail']).notNullable();
    t.string('owner').nullable();
    t.uuid('created_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);
    t.index(['model_registry_id', 'created_at']);
    t.index(['model_version_id']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('ml_evaluations');
  await knex.schema.alterTable('ml_model_versions', (t) => {
    t.dropForeign(['training_dataset_id']);
  });
  await knex.schema.dropTableIfExists('ml_datasets');
}
