// Speed Networking (Phase 1 of the phased build in .claude/plans — see plan doc
// "Speed Networking"): timed video-networking sessions with round-robin 1:1 pairing,
// ticketing, and a digital business-card exchange that can be saved into a CRM contact.
//
// Deliberately does NOT reuse `meetings`/`call_rooms` for round pair-rooms — those are keyed
// to exactly one conversation_id/meeting_id and their authorization path assumes that shape.
// A round's pairs are owned here (`speed_networking_round_pairs.livekit_room_name`), created
// via the existing `livekitGateway.js` primitives directly, same tier as `callRoom.service.js`.
//
// User-scoped throughout (no workspace_id), matching the `meetings` module's own convention.
export async function up(knex) {
  await knex.schema.createTable('speed_networking_sessions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('host_user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('title').notNullable();
    t.text('description').nullable();
    t.enu('format', ['rapid_2m', 'rapid_5m', 'rapid_10m', 'full_length']).notNullable();
    t.integer('round_duration_seconds').nullable(); // null for full_length
    t.integer('capacity').notNullable().defaultTo(20);
    t.integer('price_cents').notNullable().defaultTo(0);
    t.string('currency').notNullable().defaultTo('usd');
    t.string('stripe_price_id').nullable();
    t.timestamp('starts_at').notNullable();
    t.timestamp('ends_at').nullable();
    t.string('timezone').notNullable().defaultTo('UTC');
    t.enu('status', ['draft', 'published', 'lobby_open', 'live', 'ended', 'cancelled']).notNullable().defaultTo('draft');
    t.enu('visibility', ['public', 'unlisted']).notNullable().defaultTo('public');
    t.string('cover_image_url').nullable();
    t.integer('current_round_number').notNullable().defaultTo(0);
    t.uuid('current_round_id').nullable(); // FK added after speed_networking_rounds exists
    t.string('wizard_step').nullable(); // format | pricing | schedule | review — cleared on publish
    t.timestamps(true, true);
    t.index(['status', 'starts_at']);
    t.index(['host_user_id', 'status']);
  });

  await knex.schema.createTable('speed_networking_tickets', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('session_id').notNullable().references('id').inTable('speed_networking_sessions').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.enu('status', ['pending_payment', 'active', 'refunded', 'cancelled']).notNullable().defaultTo('pending_payment');
    t.integer('price_paid_cents').notNullable().defaultTo(0);
    t.string('stripe_checkout_session_id').nullable().unique();
    t.string('stripe_payment_intent_id').nullable();
    t.timestamp('purchased_at').nullable();
    t.timestamps(true, true);
    t.unique(['session_id', 'user_id']);
    t.index(['session_id', 'status']);
  });

  await knex.schema.createTable('speed_networking_participants', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('session_id').notNullable().references('id').inTable('speed_networking_sessions').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('ticket_id').nullable().references('id').inTable('speed_networking_tickets').onDelete('SET NULL');
    t.enu('role', ['attendee', 'host', 'cohost']).notNullable().defaultTo('attendee');
    t.enu('check_in_status', ['not_checked_in', 'checked_in', 'left']).notNullable().defaultTo('not_checked_in');
    t.timestamp('checked_in_at').nullable();
    t.timestamp('left_at').nullable();
    t.integer('rounds_completed').notNullable().defaultTo(0);
    t.timestamps(true, true);
    t.unique(['session_id', 'user_id']);
    t.index(['session_id', 'check_in_status']);
  });

  await knex.schema.createTable('speed_networking_rounds', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('session_id').notNullable().references('id').inTable('speed_networking_sessions').onDelete('CASCADE');
    t.integer('round_number').notNullable();
    t.enu('status', ['pending', 'active', 'ended']).notNullable().defaultTo('pending');
    t.timestamp('starts_at').nullable();
    t.timestamp('ends_at').nullable(); // server-authoritative countdown source
    t.integer('duration_seconds').notNullable();
    t.timestamps(true, true);
    t.unique(['session_id', 'round_number']);
  });

  await knex.schema.alterTable('speed_networking_sessions', (t) => {
    t.foreign('current_round_id').references('id').inTable('speed_networking_rounds').onDelete('SET NULL');
  });

  await knex.schema.createTable('speed_networking_round_pairs', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('round_id').notNullable().references('id').inTable('speed_networking_rounds').onDelete('CASCADE');
    t.uuid('session_id').notNullable().references('id').inTable('speed_networking_sessions').onDelete('CASCADE');
    t.uuid('participant_a_id').notNullable().references('id').inTable('speed_networking_participants').onDelete('CASCADE');
    t.uuid('participant_b_id').nullable().references('id').inTable('speed_networking_participants').onDelete('CASCADE'); // null = sit-out
    t.string('livekit_room_name').nullable();
    t.enu('status', ['pending', 'active', 'ended']).notNullable().defaultTo('pending');
    t.boolean('business_card_shared').notNullable().defaultTo(false);
    t.timestamps(true, true);
    t.index(['round_id']);
    t.index(['session_id', 'participant_a_id']);
    t.index(['session_id', 'participant_b_id']);
  });

  await knex.schema.createTable('business_cards', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('owner_user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('display_name').notNullable();
    t.string('job_title').nullable();
    t.string('company_name').nullable();
    t.string('avatar_url').nullable();
    t.string('headline').nullable();
    t.string('email').nullable(); // only populated if the owner opts in to include it on share
    t.string('phone').nullable();
    t.string('linkedin_url').nullable();
    t.string('website_url').nullable();
    t.string('location_text').nullable();
    t.string('source').notNullable().defaultTo('profile_snapshot');
    t.timestamps(true, true);
    t.index(['owner_user_id']);
  });

  await knex.schema.createTable('business_card_shares', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('business_card_id').notNullable().references('id').inTable('business_cards').onDelete('CASCADE');
    t.uuid('shared_by_user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('shared_with_user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('context_type').notNullable().defaultTo('speed_networking');
    t.uuid('context_id').nullable(); // speed_networking_round_pairs.id when triggered by a round
    t.enu('status', ['shared', 'saved', 'dismissed']).notNullable().defaultTo('shared');
    t.uuid('saved_contact_id').nullable().references('id').inTable('crm_contacts').onDelete('SET NULL');
    t.timestamp('saved_at').nullable();
    t.timestamps(true, true);
    t.unique(['business_card_id', 'shared_with_user_id', 'context_id']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('business_card_shares');
  await knex.schema.dropTableIfExists('business_cards');
  await knex.schema.dropTableIfExists('speed_networking_round_pairs');
  await knex.schema.alterTable('speed_networking_sessions', (t) => {
    t.dropForeign(['current_round_id']);
  });
  await knex.schema.dropTableIfExists('speed_networking_rounds');
  await knex.schema.dropTableIfExists('speed_networking_participants');
  await knex.schema.dropTableIfExists('speed_networking_tickets');
  await knex.schema.dropTableIfExists('speed_networking_sessions');
}
