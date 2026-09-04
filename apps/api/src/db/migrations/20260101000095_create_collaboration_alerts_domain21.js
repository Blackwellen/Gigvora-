/**
 * Domain 21: Recruiter Pro — team collaboration activity feed (comments,
 * mentions, stage moves) and the advanced alerting system.
 */
export async function up(knex) {
  await knex.schema.createTable('recruiter_collaboration_events', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE');
    t.uuid('project_id').nullable().references('id').inTable('recruiter_projects').onDelete('CASCADE');
    t.uuid('pipeline_candidate_id').nullable().references('id').inTable('pipeline_candidates').onDelete('CASCADE');
    t.uuid('actor_user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.enu('event_type', ['comment', 'mention', 'stage_move', 'assignment', 'note', 'status_change']).notNullable();
    t.text('body').nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['company_id'], 'recruiter_collab_events_company_idx');
    t.index(['project_id'], 'recruiter_collab_events_project_idx');
    t.index(['pipeline_candidate_id'], 'recruiter_collab_events_candidate_idx');
  });

  await knex.schema.createTable('advanced_alerts', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE');
    t.uuid('owner_user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.enu('alert_type', ['pipeline_stalled', 'candidate_reply', 'sequence_completed', 'campaign_underperforming', 'sla_breach', 'new_high_match', 'ats_sync_failed']).notNullable();
    t.enu('severity', ['info', 'warning', 'critical']).notNullable().defaultTo('info');
    t.string('title').notNullable();
    t.text('description').nullable();
    t.string('related_entity_type').nullable();
    t.uuid('related_entity_id').nullable();
    t.boolean('is_read').notNullable().defaultTo(false);
    t.boolean('is_resolved').notNullable().defaultTo(false);
    t.timestamps(true, true);
    t.index(['company_id', 'is_read'], 'advanced_alerts_company_read_idx');
    t.index(['company_id', 'is_resolved'], 'advanced_alerts_company_resolved_idx');
    t.index(['severity'], 'advanced_alerts_severity_idx');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('advanced_alerts');
  await knex.schema.dropTableIfExists('recruiter_collaboration_events');
}
