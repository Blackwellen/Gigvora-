export async function up(knex) {
  await knex.schema.createTable('model_registry', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('model_name').notNullable(); // feed_ranker | navigation_ranker | quick_action_ranker | people_recommender | gig_recommender
    t.string('model_version').notNullable();
    t.string('model_type').notNullable(); // deterministic | learned
    t.string('feature_schema_version').notNullable().defaultTo('v1');
    t.string('training_dataset_version').nullable();
    t.jsonb('metrics').notNullable().defaultTo('{}');
    t.string('artifact_ref').nullable();
    t.enu('status', ['shadow', 'active', 'retired']).notNullable().defaultTo('shadow');
    t.timestamp('deployed_at').nullable();
    t.timestamp('retired_at').nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.unique(['model_name', 'model_version']);
  });

  await knex.schema.alterTable('model_registry', (t) => {
    t.index(['model_name', 'status']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('model_registry');
}
