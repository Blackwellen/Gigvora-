export async function up(knex) {
  await knex.schema.createTable('conversations', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.boolean('is_group').notNullable().defaultTo(false);
    t.string('title');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('conversation_participants', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('conversation_id').notNullable().references('id').inTable('conversations').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.timestamp('last_read_at');
    t.timestamps(true, true);
    t.unique(['conversation_id', 'user_id']);
  });

  await knex.schema.createTable('messages', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('conversation_id').notNullable().references('id').inTable('conversations').onDelete('CASCADE');
    t.uuid('sender_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.text('body').notNullable();
    t.jsonb('attachments').notNullable().defaultTo('[]');
    t.timestamp('edited_at');
    t.timestamps(true, true);
  });

  await knex.schema.alterTable('messages', (t) => {
    t.index(['conversation_id', 'created_at']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('messages');
  await knex.schema.dropTableIfExists('conversation_participants');
  await knex.schema.dropTableIfExists('conversations');
}
