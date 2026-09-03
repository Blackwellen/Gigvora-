export async function up(knex) {
  await knex.schema.createTable('sessions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('session_family_id').notNullable();
    t.string('refresh_token_hash').notNullable();
    t.uuid('device_id').references('id').inTable('devices').onDelete('SET NULL');
    t.string('ip_hash');
    t.string('ip_prefix');
    t.string('user_agent_hash');
    t.string('user_agent_summary');
    t.string('country_code');
    t.string('region');
    t.string('city');
    t.enu('auth_level', ['password', 'mfa', 'passkey', 'step_up']).notNullable().defaultTo('password');
    t.decimal('risk_score', 5, 2);
    t.enu('risk_band', ['low', 'medium', 'high', 'critical']);
    t.boolean('trusted').notNullable().defaultTo(false);
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('last_seen_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('expires_at').notNullable();
    t.timestamp('revoked_at');
    t.string('revoked_reason');
    t.uuid('rotated_from_session_id');
    t.index(['user_id']);
    t.index(['session_family_id']);
    t.index(['refresh_token_hash']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('sessions');
}
