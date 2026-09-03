export async function up(knex) {
  await knex.schema.createTable('event_outbox', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('aggregate_type').notNullable();
    t.string('aggregate_id').notNullable();
    t.string('event_type').notNullable();
    t.jsonb('payload').notNullable().defaultTo('{}');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('published_at');
    t.integer('attempt_count').notNullable().defaultTo(0);
    t.string('last_error');
    t.index(['published_at']);
    t.index(['event_type']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('event_outbox');
}
