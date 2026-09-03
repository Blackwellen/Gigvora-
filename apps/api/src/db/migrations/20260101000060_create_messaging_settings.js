export async function up(knex) {
  await knex.schema.createTable('messaging_settings', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.jsonb('settings').notNullable().defaultTo('{}');
    t.timestamps(true, true);
    t.unique(['user_id']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('messaging_settings');
}
