// Domain 18 — ML observability (spec §40): every model-backed prediction
// surfaced to a user is recorded here, so scoring can be audited, its
// latency/version tracked, and overrides observed. Deliberately stores only
// a hash of the input feature snapshot, not the raw payload, to avoid
// retaining more than necessary.
export async function up(knex) {
  await knex.schema.createTable('pm_ml_predictions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('project_id').notNullable().references('id').inTable('pm_projects').onDelete('CASCADE');
    t.string('prediction_type').notNullable();
    t.string('model_name').notNullable();
    t.string('model_version').notNullable();
    t.decimal('score', 6, 2).nullable();
    t.string('band').nullable();
    t.jsonb('reason_codes').notNullable().defaultTo('[]');
    t.string('input_snapshot_hash').notNullable();
    t.integer('latency_ms').nullable();
    t.uuid('user_override_id').nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['project_id', 'prediction_type', 'created_at'], 'pm_ml_predictions_project_type_created_idx');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('pm_ml_predictions');
}
