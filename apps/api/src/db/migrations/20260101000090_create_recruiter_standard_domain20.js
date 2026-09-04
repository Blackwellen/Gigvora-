/**
 * Domain 20: Recruiter Standard.
 *
 * Reuses existing tables rather than duplicating truth:
 *  - `users` / `profiles` back every candidate reference (candidate_id
 *    columns below point at `users.id`) — candidate profile data itself is
 *    NOT duplicated here, only recruiter-only overlay data (saves, notes,
 *    pool/shortlist membership, engagement snapshots).
 *  - `conversations` / `messages` (messaging module) back the Recruiter
 *    Inbox — `recruiter_inbox_threads` is a thin tagging table over an
 *    existing conversation, not a parallel messaging system.
 *  - `billing_plans` / `user_subscriptions` (billing module) back plan
 *    pricing on the Upgrade to Recruiter Pro page.
 *
 * Deliberately distinct table names from Domain 19's business-org-scoped
 * `talent_pools` / `talent_pool_members` / `shortlists` / `shortlist_members`
 * — these are recruiter-personal collections, not company-owned ones, and
 * both domains were built in parallel against the same schema.
 */
export async function up(knex) {
  await knex.schema.createTable('recruiter_seats', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().unique().references('id').inTable('users').onDelete('CASCADE');
    t.enu('tier', ['standard', 'pro']).notNullable().defaultTo('standard');
    t.enu('status', ['active', 'trialing', 'canceled']).notNullable().defaultTo('active');
    t.integer('seats_purchased').notNullable().defaultTo(1);
    t.timestamp('activated_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('trial_ends_at').nullable();
    t.timestamps(true, true);
    t.index(['user_id', 'status'], 'recruiter_seats_user_status_idx');
  });

  await knex.schema.createTable('candidate_saves', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('recruiter_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('candidate_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.text('note').nullable();
    t.jsonb('tags').notNullable().defaultTo('[]');
    t.enu('status', ['saved', 'contacted', 'archived']).notNullable().defaultTo('saved');
    t.timestamp('saved_at').notNullable().defaultTo(knex.fn.now());
    t.timestamps(true, true);
    t.unique(['recruiter_id', 'candidate_id']);
    t.index(['recruiter_id', 'status'], 'candidate_saves_recruiter_status_idx');
  });

  await knex.schema.createTable('recruiter_projects', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('recruiter_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('name').notNullable();
    t.text('description').nullable();
    t.string('client_or_role').nullable();
    t.enu('status', ['active', 'on_hold', 'completed', 'archived']).notNullable().defaultTo('active');
    t.integer('target_hires').notNullable().defaultTo(1);
    t.integer('filled_hires').notNullable().defaultTo(0);
    t.date('target_date').nullable();
    t.timestamps(true, true);
    t.index(['recruiter_id', 'status'], 'recruiter_projects_recruiter_status_idx');
  });

  await knex.schema.createTable('recruiter_project_members', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('project_id').notNullable().references('id').inTable('recruiter_projects').onDelete('CASCADE');
    t.uuid('candidate_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.string('candidate_name').notNullable();
    t.enu('stage', ['sourced', 'contacted', 'screening', 'shortlisted', 'submitted', 'rejected', 'hired']).notNullable().defaultTo('sourced');
    t.uuid('added_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.text('notes').nullable();
    t.timestamp('added_at').notNullable().defaultTo(knex.fn.now());
    t.timestamps(true, true);
    t.index(['project_id', 'stage'], 'recruiter_project_members_project_stage_idx');
  });

  await knex.schema.createTable('candidate_notes', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('recruiter_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('candidate_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.text('body').notNullable();
    t.boolean('is_pinned').notNullable().defaultTo(false);
    t.timestamps(true, true);
    t.index(['recruiter_id', 'candidate_id'], 'candidate_notes_recruiter_candidate_idx');
  });

  await knex.schema.createTable('recruiter_talent_pools', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('recruiter_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('name').notNullable();
    t.text('description').nullable();
    t.integer('member_count').notNullable().defaultTo(0);
    t.enu('status', ['active', 'archived']).notNullable().defaultTo('active');
    t.jsonb('tags').notNullable().defaultTo('[]');
    t.timestamps(true, true);
    t.index(['recruiter_id', 'status'], 'recruiter_talent_pools_recruiter_status_idx');
  });

  await knex.schema.createTable('recruiter_talent_pool_members', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('pool_id').notNullable().references('id').inTable('recruiter_talent_pools').onDelete('CASCADE');
    t.uuid('candidate_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.string('candidate_name').notNullable();
    t.string('candidate_email').nullable();
    t.decimal('match_score', 5, 2).nullable();
    t.uuid('added_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.text('notes').nullable();
    t.timestamp('added_at').notNullable().defaultTo(knex.fn.now());
    t.timestamps(true, true);
    t.index(['pool_id'], 'recruiter_talent_pool_members_pool_idx');
  });

  await knex.schema.createTable('recruiter_shortlists', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('recruiter_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('project_id').nullable().references('id').inTable('recruiter_projects').onDelete('SET NULL');
    t.string('name').notNullable();
    t.text('description').nullable();
    t.enu('status', ['active', 'archived']).notNullable().defaultTo('active');
    t.timestamps(true, true);
    t.index(['recruiter_id', 'status'], 'recruiter_shortlists_recruiter_status_idx');
  });

  await knex.schema.createTable('recruiter_shortlist_members', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('shortlist_id').notNullable().references('id').inTable('recruiter_shortlists').onDelete('CASCADE');
    t.uuid('candidate_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.string('candidate_name').notNullable();
    t.integer('rank').nullable();
    t.text('notes').nullable();
    t.uuid('added_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('added_at').notNullable().defaultTo(knex.fn.now());
    t.timestamps(true, true);
    t.index(['shortlist_id'], 'recruiter_shortlist_members_shortlist_idx');
  });

  await knex.schema.createTable('recruiter_saved_searches', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('recruiter_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('name').notNullable();
    t.jsonb('filters').notNullable().defaultTo('{}');
    t.timestamp('last_run_at').nullable();
    t.timestamps(true, true);
    t.index(['recruiter_id'], 'recruiter_saved_searches_recruiter_idx');
  });

  await knex.schema.createTable('recruiter_search_alerts', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('recruiter_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('saved_search_id').nullable().references('id').inTable('recruiter_saved_searches').onDelete('SET NULL');
    t.string('name').notNullable();
    t.jsonb('filters').notNullable().defaultTo('{}');
    t.enu('frequency', ['instant', 'daily', 'weekly']).notNullable().defaultTo('daily');
    t.enu('status', ['active', 'paused']).notNullable().defaultTo('active');
    t.timestamp('last_run_at').nullable();
    t.integer('new_matches_count').notNullable().defaultTo(0);
    t.timestamps(true, true);
    t.index(['recruiter_id', 'status'], 'recruiter_search_alerts_recruiter_status_idx');
  });

  await knex.schema.createTable('candidate_engagement_snapshots', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('candidate_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.date('snapshot_date').notNullable();
    t.integer('profile_views_30d').notNullable().defaultTo(0);
    t.decimal('response_rate_pct', 5, 2).notNullable().defaultTo(0);
    t.decimal('avg_response_time_hours', 6, 2).nullable();
    t.timestamp('last_active_at').nullable();
    t.enu('availability_status', ['open_to_work', 'open_to_offers', 'not_looking']).notNullable().defaultTo('open_to_offers');
    t.decimal('engagement_score', 5, 2).notNullable().defaultTo(0);
    t.timestamps(true, true);
    t.unique(['candidate_id', 'snapshot_date']);
    t.index(['candidate_id'], 'candidate_engagement_snapshots_candidate_idx');
  });

  await knex.schema.createTable('recruiter_inbox_threads', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('recruiter_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('candidate_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.uuid('conversation_id').notNullable().references('id').inTable('conversations').onDelete('CASCADE');
    t.uuid('project_id').nullable().references('id').inTable('recruiter_projects').onDelete('SET NULL');
    t.enu('status', ['active', 'snoozed', 'archived']).notNullable().defaultTo('active');
    t.timestamps(true, true);
    t.unique(['recruiter_id', 'conversation_id']);
    t.index(['recruiter_id', 'status'], 'recruiter_inbox_threads_recruiter_status_idx');
  });

  await knex.schema.createTable('recruiter_upgrade_requests', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.integer('requested_seats').notNullable().defaultTo(1);
    t.enu('billing_cycle', ['monthly', 'annual']).notNullable().defaultTo('monthly');
    t.enu('status', ['pending', 'checkout_started', 'completed', 'cancelled']).notNullable().defaultTo('pending');
    t.text('note').nullable();
    t.string('checkout_url').nullable();
    t.timestamps(true, true);
    t.index(['user_id', 'status'], 'recruiter_upgrade_requests_user_status_idx');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('recruiter_upgrade_requests');
  await knex.schema.dropTableIfExists('recruiter_inbox_threads');
  await knex.schema.dropTableIfExists('candidate_engagement_snapshots');
  await knex.schema.dropTableIfExists('recruiter_search_alerts');
  await knex.schema.dropTableIfExists('recruiter_saved_searches');
  await knex.schema.dropTableIfExists('recruiter_shortlist_members');
  await knex.schema.dropTableIfExists('recruiter_shortlists');
  await knex.schema.dropTableIfExists('recruiter_talent_pool_members');
  await knex.schema.dropTableIfExists('recruiter_talent_pools');
  await knex.schema.dropTableIfExists('candidate_notes');
  await knex.schema.dropTableIfExists('recruiter_project_members');
  await knex.schema.dropTableIfExists('recruiter_projects');
  await knex.schema.dropTableIfExists('candidate_saves');
  await knex.schema.dropTableIfExists('recruiter_seats');
}
