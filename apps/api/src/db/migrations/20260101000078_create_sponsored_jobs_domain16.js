export async function up(knex) {
  await knex.schema.createTable('sponsored_job_campaigns', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('job_id').notNullable().references('id').inTable('jobs').onDelete('CASCADE');
    t.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE');
    t.decimal('budget_total', 12, 2).notNullable();
    t.decimal('budget_daily', 12, 2).nullable();
    t.enu('bid_type', ['cpc', 'cpa', 'flat']).notNullable().defaultTo('cpc');
    t.decimal('bid_amount', 10, 2).notNullable();
    t.enu('status', ['draft', 'active', 'paused', 'completed']).notNullable().defaultTo('draft');
    t.timestamp('starts_at').nullable();
    t.timestamp('ends_at').nullable();
    t.jsonb('targeting').notNullable().defaultTo('{}');
    t.timestamps(true, true);
    t.index(['job_id'], 'sponsored_job_campaigns_job_id_idx');
    t.index(['company_id'], 'sponsored_job_campaigns_company_id_idx');
    t.index(['status'], 'sponsored_job_campaigns_status_idx');
  });

  await knex.schema.createTable('sponsored_job_events', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('campaign_id').notNullable().references('id').inTable('sponsored_job_campaigns').onDelete('CASCADE');
    t.enu('event_type', ['impression', 'click', 'apply']).notNullable();
    t.timestamp('occurred_at').notNullable().defaultTo(knex.fn.now());
    t.decimal('cost', 10, 4).notNullable().defaultTo(0);
    t.index(['campaign_id', 'occurred_at'], 'sponsored_job_events_campaign_occurred_idx');
    t.index(['event_type'], 'sponsored_job_events_event_type_idx');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('sponsored_job_events');
  await knex.schema.dropTableIfExists('sponsored_job_campaigns');
}
