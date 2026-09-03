export async function up(knex) {
  await knex.schema.createTable('mfa_recovery_codes', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('mfa_method_id').references('id').inTable('mfa_methods').onDelete('CASCADE');
    t.string('code_hash').notNullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('consumed_at');
    t.timestamp('revoked_at');
    t.index(['user_id']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('mfa_recovery_codes');
}
