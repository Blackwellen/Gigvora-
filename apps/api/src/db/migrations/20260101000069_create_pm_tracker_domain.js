// Domain 18 §17 — Desktop activity tracker contract. This repo has no
// desktop client to pair with, so this is the server-side contract a real
// tracker app would call (heartbeat, screenshot upload with consent) — not
// wired to a fabricated client. Every row is consent-gated: a session
// records explicit consent + the screenshot policy in force at start time,
// and no heartbeat/screenshot is accepted for a session without consent.
export async function up(knex) {
  await knex.schema.createTable('pm_time_sessions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('project_id').notNullable().references('id').inTable('pm_projects').onDelete('CASCADE');
    t.uuid('time_entry_id').notNullable().references('id').inTable('pm_time_entries').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.boolean('consent_given').notNullable().defaultTo(false);
    t.boolean('screenshots_enabled').notNullable().defaultTo(false);
    t.integer('screenshot_interval_minutes').nullable();
    t.enu('status', ['active', 'paused', 'stopped']).notNullable().defaultTo('active');
    t.timestamp('paused_at').nullable();
    t.timestamp('stopped_at').nullable();
    t.timestamps(true, true);
    t.index(['project_id', 'user_id', 'status'], 'pm_time_sessions_project_user_status_idx');
  });

  await knex.schema.createTable('pm_activity_samples', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('session_id').notNullable().references('id').inTable('pm_time_sessions').onDelete('CASCADE');
    // Deliberately NOT capturing keystroke contents, window titles, or raw
    // input events — only a 0-100 activity score (derived client-side from
    // keyboard/mouse event COUNTS, per spec §17) and a coarse app category.
    t.integer('activity_score').notNullable();
    t.boolean('idle').notNullable().defaultTo(false);
    t.string('app_category').nullable();
    t.timestamp('sampled_at').notNullable().defaultTo(knex.fn.now());
    t.index(['session_id', 'sampled_at'], 'pm_activity_samples_session_sampled_idx');
  });

  await knex.schema.createTable('pm_screenshot_assets', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('session_id').notNullable().references('id').inTable('pm_time_sessions').onDelete('CASCADE');
    t.string('object_key').notNullable();
    t.boolean('blurred').notNullable().defaultTo(false);
    t.timestamp('captured_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('deleted_at').nullable();
    t.uuid('deleted_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.index(['session_id', 'captured_at'], 'pm_screenshot_assets_session_captured_idx');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('pm_screenshot_assets');
  await knex.schema.dropTableIfExists('pm_activity_samples');
  await knex.schema.dropTableIfExists('pm_time_sessions');
}
