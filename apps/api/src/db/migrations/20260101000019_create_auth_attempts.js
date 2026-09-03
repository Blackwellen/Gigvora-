export async function up(knex) {
  await knex.schema.createTable('auth_attempts', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');
    t.string('identity_hint_hash');
    t.string('attempt_type').notNullable();
    t.string('outcome').notNullable();
    t.string('failure_reason');
    t.string('ip_hash');
    t.jsonb('network_features').notNullable().defaultTo('{}');
    t.jsonb('device_features').notNullable().defaultTo('{}');
    t.jsonb('client_features').notNullable().defaultTo('{}');
    t.decimal('bot_score', 5, 2);
    t.decimal('risk_score', 5, 2);
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['user_id']);
    t.index(['identity_hint_hash']);
    t.index(['created_at']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('auth_attempts');
}
