export async function up(knex) {
  await knex.schema.alterTable('users', (t) => {
    t.enu('status', ['active', 'locked', 'suspended', 'deleted']).notNullable().defaultTo('active');
    t.timestamp('email_verified_at');
    t.timestamp('locked_at');
    t.timestamp('suspended_at');
    t.timestamp('last_authenticated_at');
    t.timestamp('deleted_at');
  });

  await knex.raw(`
    UPDATE users SET email_verified_at = now() WHERE is_verified = true AND email_verified_at IS NULL
  `);
}

export async function down(knex) {
  await knex.schema.alterTable('users', (t) => {
    t.dropColumn('status');
    t.dropColumn('email_verified_at');
    t.dropColumn('locked_at');
    t.dropColumn('suspended_at');
    t.dropColumn('last_authenticated_at');
    t.dropColumn('deleted_at');
  });
}
