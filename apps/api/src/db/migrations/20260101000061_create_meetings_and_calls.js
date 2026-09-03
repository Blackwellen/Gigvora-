// Meetings/calls are user-scoped (host_user_id / participant user_id), same
// as the rest of the messaging domain — this codebase has no `workspaces`
// table (the "account-contexts" module is account switching, not a
// multi-tenant workspace), so there is nothing to key a workspace_id against.
export async function up(knex) {
  await knex.schema.createTable('meetings', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('conversation_id').references('id').inTable('conversations').onDelete('SET NULL');
    t.uuid('project_id');
    t.string('title').notNullable();
    t.text('description');
    t.uuid('host_user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('meeting_type').notNullable().defaultTo('internal');
    t.timestamp('starts_at').notNullable();
    t.timestamp('ends_at').notNullable();
    t.string('timezone').notNullable().defaultTo('UTC');
    t.string('location_type').notNullable().defaultTo('video');
    t.string('provider').notNullable().defaultTo('livekit');
    t.string('provider_room_id');
    t.string('meeting_url_ref');
    t.string('status').notNullable().defaultTo('scheduled');
    t.string('recurrence_rule');
    t.uuid('calendar_event_id');
    t.timestamps(true, true);
    t.index(['host_user_id', 'starts_at']);
    t.index(['status']);
  });

  await knex.schema.createTable('meeting_participants', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('meeting_id').notNullable().references('id').inTable('meetings').onDelete('CASCADE');
    t.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    t.string('external_email');
    t.string('role').notNullable().defaultTo('attendee');
    t.string('attendance_status').notNullable().defaultTo('no_response');
    t.string('invitation_status').notNullable().defaultTo('pending');
    t.timestamps(true, true);
    t.unique(['meeting_id', 'user_id']);
    t.index(['meeting_id']);
  });

  await knex.schema.createTable('meeting_agenda_items', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('meeting_id').notNullable().references('id').inTable('meetings').onDelete('CASCADE');
    t.integer('order_index').notNullable().defaultTo(0);
    t.string('title').notNullable();
    t.uuid('owner_user_id').references('id').inTable('users').onDelete('SET NULL');
    t.integer('duration_minutes');
    t.text('objective');
    t.string('status').notNullable().defaultTo('pending');
    t.timestamps(true, true);
    t.index(['meeting_id', 'order_index']);
  });

  await knex.schema.createTable('meeting_notes', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('meeting_id').notNullable().references('id').inTable('meetings').onDelete('CASCADE');
    t.uuid('author_user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.text('body').notNullable();
    t.string('visibility').notNullable().defaultTo('participants');
    t.timestamps(true, true);
    t.index(['meeting_id']);
  });

  await knex.schema.createTable('meeting_action_items', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('meeting_id').notNullable().references('id').inTable('meetings').onDelete('CASCADE');
    t.string('title').notNullable();
    t.uuid('owner_user_id').references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('due_at');
    t.string('status').notNullable().defaultTo('open');
    t.string('source').notNullable().defaultTo('manual');
    t.timestamps(true, true);
    t.index(['meeting_id']);
  });

  await knex.schema.createTable('call_rooms', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('conversation_id').references('id').inTable('conversations').onDelete('SET NULL');
    t.uuid('meeting_id').references('id').inTable('meetings').onDelete('SET NULL');
    t.string('provider').notNullable().defaultTo('livekit');
    t.string('provider_room_id').notNullable();
    t.string('status').notNullable().defaultTo('active');
    t.uuid('created_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.timestamp('started_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('ended_at');
    t.timestamps(true, true);
    t.index(['conversation_id']);
    t.index(['meeting_id']);
  });

  await knex.schema.createTable('call_participants', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('call_id').notNullable().references('id').inTable('call_rooms').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.timestamp('joined_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('left_at');
    t.string('role').notNullable().defaultTo('participant');
    t.jsonb('connection_quality_metadata').notNullable().defaultTo('{}');
    t.index(['call_id']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('call_participants');
  await knex.schema.dropTableIfExists('call_rooms');
  await knex.schema.dropTableIfExists('meeting_action_items');
  await knex.schema.dropTableIfExists('meeting_notes');
  await knex.schema.dropTableIfExists('meeting_agenda_items');
  await knex.schema.dropTableIfExists('meeting_participants');
  await knex.schema.dropTableIfExists('meetings');
}
