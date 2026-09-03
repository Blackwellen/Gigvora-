export async function up(knex) {
  await knex.schema.createTable('notifications', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('type').notNullable();
    t.jsonb('payload').notNullable().defaultTo('{}');
    t.boolean('is_read').notNullable().defaultTo(false);
    t.timestamps(true, true);
  });

  await knex.schema.alterTable('notifications', (t) => {
    t.index(['user_id', 'is_read']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('notifications');
}
