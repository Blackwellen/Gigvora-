export async function up(knex) {
  await knex.schema.alterTable('conversations', (t) => {
    t.string('context_type');
    t.uuid('context_id');
    t.string('visibility').notNullable().defaultTo('private');
    t.boolean('is_request').notNullable().defaultTo(false);
    t.uuid('last_message_id');
    t.timestamp('last_message_at');
    t.timestamp('archived_at');
    t.index(['context_type', 'context_id']);
    t.index(['is_request']);
  });

  await knex.schema.alterTable('conversation_participants', (t) => {
    t.string('role').notNullable().defaultTo('member');
    t.string('notification_level').notNullable().defaultTo('all');
    t.boolean('is_pinned').notNullable().defaultTo(false);
    t.boolean('is_muted').notNullable().defaultTo(false);
    t.timestamp('archived_at');
  });

  await knex.schema.alterTable('messages', (t) => {
    t.uuid('reply_to_message_id').references('id').inTable('messages').onDelete('SET NULL');
    t.string('client_message_id');
    t.string('status').notNullable().defaultTo('sent');
    t.timestamp('deleted_at');
    t.string('message_type').notNullable().defaultTo('text');
    t.string('safety_label');
    t.decimal('safety_confidence', 5, 4);
    t.unique(['conversation_id', 'client_message_id']);
  });

  await knex.schema.createTable('message_reactions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('message_id').notNullable().references('id').inTable('messages').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('reaction').notNullable();
    t.timestamps(true, true);
    t.unique(['message_id', 'user_id', 'reaction']);
  });

  await knex.schema.createTable('message_pins', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('conversation_id').notNullable().references('id').inTable('conversations').onDelete('CASCADE');
    t.uuid('message_id').notNullable().references('id').inTable('messages').onDelete('CASCADE');
    t.uuid('pinned_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.timestamp('pinned_at').notNullable().defaultTo(knex.fn.now());
    t.unique(['conversation_id', 'message_id']);
  });

  await knex.schema.createTable('message_mentions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('message_id').notNullable().references('id').inTable('messages').onDelete('CASCADE');
    t.uuid('mentioned_user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.timestamps(true, true);
    t.unique(['message_id', 'mentioned_user_id']);
  });

  await knex.schema.createTable('message_polls', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('message_id').notNullable().references('id').inTable('messages').onDelete('CASCADE');
    t.text('question').notNullable();
    t.jsonb('options').notNullable();
    t.timestamp('closes_at');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('message_poll_votes', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('poll_id').notNullable().references('id').inTable('message_polls').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.integer('option_index').notNullable();
    t.timestamps(true, true);
    t.unique(['poll_id', 'user_id']);
  });

  await knex.schema.createTable('message_requests', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('conversation_id').notNullable().references('id').inTable('conversations').onDelete('CASCADE');
    t.uuid('sender_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('recipient_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.enu('status', ['pending', 'accepted', 'declined', 'blocked', 'spam']).notNullable().defaultTo('pending');
    t.decimal('relevance_score', 5, 4);
    t.string('safety_label');
    t.decimal('safety_confidence', 5, 4);
    t.timestamps(true, true);
    t.timestamp('decided_at');
    t.unique(['conversation_id', 'recipient_id']);
    t.index(['recipient_id', 'status']);
  });

  await knex.schema.createTable('conversation_summaries', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('conversation_id').notNullable().references('id').inTable('conversations').onDelete('CASCADE');
    t.text('summary').notNullable();
    t.uuid('message_range_start_id').references('id').inTable('messages').onDelete('SET NULL');
    t.uuid('message_range_end_id').references('id').inTable('messages').onDelete('SET NULL');
    t.string('model').notNullable();
    t.timestamp('generated_at').notNullable().defaultTo(knex.fn.now());
    t.index(['conversation_id', 'generated_at']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('conversation_summaries');
  await knex.schema.dropTableIfExists('message_requests');
  await knex.schema.dropTableIfExists('message_poll_votes');
  await knex.schema.dropTableIfExists('message_polls');
  await knex.schema.dropTableIfExists('message_mentions');
  await knex.schema.dropTableIfExists('message_pins');
  await knex.schema.dropTableIfExists('message_reactions');

  await knex.schema.alterTable('messages', (t) => {
    t.dropUnique(['conversation_id', 'client_message_id']);
    t.dropColumn('safety_confidence');
    t.dropColumn('safety_label');
    t.dropColumn('message_type');
    t.dropColumn('deleted_at');
    t.dropColumn('status');
    t.dropColumn('client_message_id');
    t.dropColumn('reply_to_message_id');
  });

  await knex.schema.alterTable('conversation_participants', (t) => {
    t.dropColumn('archived_at');
    t.dropColumn('is_muted');
    t.dropColumn('is_pinned');
    t.dropColumn('notification_level');
    t.dropColumn('role');
  });

  await knex.schema.alterTable('conversations', (t) => {
    t.dropColumn('archived_at');
    t.dropColumn('last_message_at');
    t.dropColumn('last_message_id');
    t.dropColumn('is_request');
    t.dropColumn('visibility');
    t.dropColumn('context_id');
    t.dropColumn('context_type');
  });
}
