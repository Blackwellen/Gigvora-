export async function up(knex) {
  await knex.schema.createTable('mfa_methods', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.enu('method_type', ['totp', 'recovery_email', 'recovery_phone', 'security_key']).notNullable();
    t.string('label');
    t.string('secret_ref');
    t.string('phone_ref');
    t.string('email_ref');
    t.enu('status', ['pending', 'active', 'revoked']).notNullable().defaultTo('pending');
    t.timestamp('verified_at');
    t.timestamp('last_used_at');
    t.timestamp('revoked_at');
    t.timestamps(true, true);
    t.index(['user_id']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('mfa_methods');
}
