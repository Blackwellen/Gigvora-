export async function up(knex) {
  await knex.schema.createTable('security_events', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    t.uuid('session_id');
    t.uuid('device_id');
    t.string('type').notNullable();
    t.enu('severity', ['info', 'low', 'medium', 'high', 'critical']).notNullable().defaultTo('info');
    t.decimal('risk_score', 5, 2);
    t.enu('risk_band', ['low', 'medium', 'high', 'critical']);
    t.string('actor_type').notNullable().defaultTo('user');
    t.uuid('actor_id');
    t.string('source').notNullable().defaultTo('api');
    t.jsonb('metadata').notNullable().defaultTo('{}');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['user_id']);
    t.index(['type']);
    t.index(['created_at']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('security_events');
}
