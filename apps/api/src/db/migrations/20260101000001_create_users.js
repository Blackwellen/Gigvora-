export async function up(knex) {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
  await knex.schema.createTable('users', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('email').notNullable().unique();
    t.string('password_hash').notNullable();
    t.string('first_name').notNullable();
    t.string('last_name').notNullable();
    t.string('headline');
    t.enu('account_type', ['individual', 'recruiter', 'company']).notNullable().defaultTo('individual');
    t.enu('role', ['user', 'admin']).notNullable().defaultTo('user');
    t.boolean('is_verified').notNullable().defaultTo(false);
    t.timestamp('last_login_at');
    t.timestamps(true, true);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('users');
}
