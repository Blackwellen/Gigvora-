export async function up(knex) {
  await knex.schema.createTable('devices', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('device_fingerprint_hash').notNullable();
    t.string('display_name');
    t.string('platform');
    t.string('os_name');
    t.string('os_version');
    t.string('browser_name');
    t.string('browser_version');
    t.enu('device_type', ['desktop', 'laptop', 'mobile', 'tablet', 'server', 'unknown']).notNullable().defaultTo('unknown');
    t.timestamp('first_seen_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('last_seen_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('trusted_at');
    t.timestamp('trust_expires_at');
    t.timestamp('revoked_at');
    t.jsonb('metadata').notNullable().defaultTo('{}');
    t.timestamps(true, true);
    t.index(['user_id']);
    t.index(['device_fingerprint_hash']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('devices');
}
