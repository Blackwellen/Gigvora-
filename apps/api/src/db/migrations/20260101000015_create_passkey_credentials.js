export async function up(knex) {
  await knex.schema.createTable('passkey_credentials', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('credential_id').notNullable().unique();
    t.text('public_key').notNullable();
    t.bigInteger('sign_count').notNullable().defaultTo(0);
    t.string('aaguid');
    t.jsonb('transports').notNullable().defaultTo('[]');
    t.string('user_handle_ref').notNullable();
    t.boolean('backup_eligible').notNullable().defaultTo(false);
    t.boolean('backup_state').notNullable().defaultTo(false);
    t.string('label');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('last_used_at');
    t.timestamp('revoked_at');
    t.index(['user_id']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('passkey_credentials');
}
