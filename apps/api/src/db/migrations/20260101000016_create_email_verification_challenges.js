export async function up(knex) {
  await knex.schema.createTable('email_verification_challenges', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('email_normalized').notNullable();
    t.string('token_hash').notNullable();
    t.timestamp('expires_at').notNullable();
    t.timestamp('consumed_at');
    t.integer('send_count').notNullable().defaultTo(1);
    t.timestamp('last_sent_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['user_id']);
    t.index(['token_hash']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('email_verification_challenges');
}
