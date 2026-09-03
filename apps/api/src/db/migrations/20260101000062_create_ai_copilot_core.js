// Domain 25 core (Copilot threads/messages/citations). User-scoped like the
// rest of this codebase (no workspace_id — see meetings migration comment).
export async function up(knex) {
  await knex.schema.createTable('ai_threads', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('title');
    t.string('status').notNullable().defaultTo('active');
    t.jsonb('context_json').notNullable().defaultTo('{}');
    t.string('model_preference');
    t.timestamps(true, true);
    t.timestamp('archived_at');
    t.index(['user_id', 'updated_at']);
  });

  await knex.schema.createTable('ai_messages', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('thread_id').notNullable().references('id').inTable('ai_threads').onDelete('CASCADE');
    t.string('role').notNullable(); // 'user' | 'assistant' | 'system'
    t.text('content').notNullable();
    t.string('model_id');
    t.string('model_version');
    t.string('provider');
    t.integer('input_tokens');
    t.integer('output_tokens');
    t.integer('latency_ms');
    t.string('finish_reason');
    t.string('grounding_state').notNullable().defaultTo('none'); // 'none' | 'grounded' | 'unavailable'
    t.timestamps(true, true);
    t.index(['thread_id', 'created_at']);
  });

  await knex.schema.createTable('ai_message_sources', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('message_id').notNullable().references('id').inTable('ai_messages').onDelete('CASCADE');
    t.string('source_type').notNullable(); // e.g. 'inbox', 'jobs', 'connections', 'meetings'
    t.string('source_id');
    t.string('label').notNullable();
    t.string('route');
    t.timestamps(true, true);
    t.index(['message_id']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('ai_message_sources');
  await knex.schema.dropTableIfExists('ai_messages');
  await knex.schema.dropTableIfExists('ai_threads');
}
