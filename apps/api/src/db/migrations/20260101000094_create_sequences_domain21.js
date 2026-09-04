/**
 * Domain 21: Recruiter Pro — multi-step recruiter outreach sequences,
 * candidate enrollments, and the outreach event log (opens/replies/etc.)
 * shared by both sequences and one-off campaigns.
 */
export async function up(knex) {
  await knex.schema.createTable('recruiter_sequences', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE');
    t.string('name').notNullable();
    t.text('description').nullable();
    t.enu('status', ['draft', 'active', 'paused', 'archived']).notNullable().defaultTo('draft');
    t.integer('enrolled_count').notNullable().defaultTo(0);
    t.integer('completed_count').notNullable().defaultTo(0);
    t.uuid('created_by_user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);
    t.index(['company_id', 'status'], 'recruiter_sequences_company_status_idx');
  });

  await knex.schema.createTable('sequence_steps', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('sequence_id').notNullable().references('id').inTable('recruiter_sequences').onDelete('CASCADE');
    t.integer('step_order').notNullable().defaultTo(0);
    t.enu('step_type', ['email', 'linkedin', 'wait', 'branch', 'task']).notNullable().defaultTo('email');
    t.string('subject').nullable();
    t.text('body').nullable();
    t.integer('wait_days').nullable();
    t.text('branch_condition').nullable();
    t.timestamps(true, true);
    t.index(['sequence_id', 'step_order'], 'sequence_steps_sequence_order_idx');
  });

  await knex.schema.createTable('sequence_enrollments', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('sequence_id').notNullable().references('id').inTable('recruiter_sequences').onDelete('CASCADE');
    t.uuid('candidate_user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.string('candidate_name').notNullable();
    t.string('candidate_email').nullable();
    t.integer('current_step_order').notNullable().defaultTo(0);
    t.enu('status', ['active', 'completed', 'paused', 'exited']).notNullable().defaultTo('active');
    t.timestamp('enrolled_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('completed_at').nullable();
    t.timestamps(true, true);
    t.index(['sequence_id', 'status'], 'sequence_enrollments_sequence_status_idx');
  });

  await knex.schema.createTable('outreach_events', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('enrollment_id').nullable().references('id').inTable('sequence_enrollments').onDelete('CASCADE');
    t.uuid('campaign_id').nullable().references('id').inTable('outreach_campaigns').onDelete('CASCADE');
    t.uuid('candidate_user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.enu('event_type', ['sent', 'opened', 'clicked', 'replied', 'bounced', 'unsubscribed', 'connected', 'viewed']).notNullable();
    t.enu('channel', ['email', 'linkedin', 'sms']).notNullable().defaultTo('email');
    t.timestamp('occurred_at').notNullable().defaultTo(knex.fn.now());
    t.jsonb('metadata').nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['enrollment_id'], 'outreach_events_enrollment_idx');
    t.index(['campaign_id'], 'outreach_events_campaign_idx');
    t.index(['event_type'], 'outreach_events_type_idx');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('outreach_events');
  await knex.schema.dropTableIfExists('sequence_enrollments');
  await knex.schema.dropTableIfExists('sequence_steps');
  await knex.schema.dropTableIfExists('recruiter_sequences');
}
