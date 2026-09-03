export async function up(knex) {
  await knex.schema.createTable('password_reset_challenges', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('token_hash').notNullable();
    t.string('requested_ip_hash');
    t.timestamp('expires_at').notNullable();
    t.timestamp('consumed_at');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['user_id']);
    t.index(['token_hash']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('password_reset_challenges');
}
