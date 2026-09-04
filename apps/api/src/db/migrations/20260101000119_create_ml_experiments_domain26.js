// Domain 26 — controlled A/B experiments between model versions on a given surface.
export async function up(knex) {
  await knex.schema.createTable('ml_experiments', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('model_registry_id').notNullable().references('id').inTable('model_registry').onDelete('CASCADE');
    t.string('name').notNullable();
    t.string('surface').notNullable(); // e.g. 'jobs_home.recommended_jobs'
    t.text('hypothesis').nullable();
    t.uuid('control_version_id').notNullable().references('id').inTable('ml_model_versions').onDelete('CASCADE');
    t.enu('status', ['draft', 'running', 'paused', 'completed', 'stopped']).notNullable().defaultTo('draft');
    t.string('primary_metric').notNullable();
    t.jsonb('guardrail_metrics').notNullable().defaultTo('[]');
    t.string('owner').nullable();
    t.timestamp('started_at').nullable();
    t.timestamp('ended_at').nullable();
    t.timestamps(true, true);
    t.index(['model_registry_id', 'status']);
  });

  await knex.schema.createTable('ml_experiment_variants', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('experiment_id').notNullable().references('id').inTable('ml_experiments').onDelete('CASCADE');
    t.string('label').notNullable(); // 'control' | 'variant_a' ...
    t.uuid('model_version_id').notNullable().references('id').inTable('ml_model_versions').onDelete('CASCADE');
    t.decimal('traffic_percent', 5, 2).notNullable().defaultTo(0);
    t.timestamps(true, true);
    t.index(['experiment_id']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('ml_experiment_variants');
  await knex.schema.dropTableIfExists('ml_experiments');
}
