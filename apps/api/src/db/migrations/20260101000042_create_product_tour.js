// Domain 04 §45: per-user product tour progress + a raw event log for
// analytics/funnel purposes.
export async function up(knex) {
  await knex.schema.createTable('product_tour_progress', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('tour_key').notNullable();
    t.enu('status', ['not_started', 'in_progress', 'completed', 'dismissed']).notNullable().defaultTo('not_started');
    t.integer('current_step_index').notNullable().defaultTo(0);
    t.timestamp('started_at').nullable();
    t.timestamp('completed_at').nullable();
    t.timestamp('dismissed_at').nullable();
    t.timestamps(true, true);
    t.unique(['user_id', 'tour_key']);
  });

  await knex.schema.createTable('tour_step_events', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('tour_key').notNullable();
    t.string('step_key').nullable();
    t.enu('event_type', ['start', 'step_view', 'step_complete', 'complete', 'dismiss', 'skip']).notNullable();
    t.timestamp('occurred_at').notNullable().defaultTo(knex.fn.now());
    t.jsonb('metadata').notNullable().defaultTo('{}');
  });
  await knex.schema.alterTable('tour_step_events', (t) => {
    t.index(['user_id', 'tour_key']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('tour_step_events');
  await knex.schema.dropTableIfExists('product_tour_progress');
}
