export async function up(knex) {
  await knex.schema.createTable('identities', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.enu('provider', ['password', 'google', 'microsoft', 'apple', 'passkey']).notNullable();
    t.string('provider_subject').notNullable();
    t.string('provider_email');
    t.boolean('provider_email_verified').notNullable().defaultTo(false);
    t.jsonb('provider_metadata').notNullable().defaultTo('{}');
    t.timestamp('verified_at');
    t.timestamp('last_used_at');
    t.timestamps(true, true);
    t.unique(['provider', 'provider_subject']);
    t.index(['user_id']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('identities');
}
