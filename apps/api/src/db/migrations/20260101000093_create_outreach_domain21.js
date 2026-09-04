/**
 * Domain 21: Recruiter Pro — outreach templates, campaigns, audiences and
 * A/B variants.
 */
export async function up(knex) {
  await knex.schema.createTable('outreach_templates', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE');
    t.string('name').notNullable();
    t.enu('channel', ['email', 'linkedin', 'sms']).notNullable().defaultTo('email');
    t.string('subject').nullable();
    t.text('body').notNullable();
    t.string('category').nullable();
    t.integer('usage_count').notNullable().defaultTo(0);
    t.uuid('created_by_user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);
    t.index(['company_id', 'channel'], 'outreach_templates_company_channel_idx');
  });

  await knex.schema.createTable('outreach_campaigns', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE');
    t.string('name').notNullable();
    t.enu('status', ['draft', 'scheduled', 'sending', 'completed', 'paused']).notNullable().defaultTo('draft');
    t.enu('channel', ['email', 'linkedin', 'sms', 'multi']).notNullable().defaultTo('email');
    t.uuid('template_id').nullable().references('id').inTable('outreach_templates').onDelete('SET NULL');
    t.timestamp('scheduled_at').nullable();
    t.integer('sent_count').notNullable().defaultTo(0);
    t.integer('reply_count').notNullable().defaultTo(0);
    t.uuid('created_by_user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);
    t.index(['company_id', 'status'], 'outreach_campaigns_company_status_idx');
  });

  await knex.schema.createTable('campaign_audiences', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('campaign_id').notNullable().references('id').inTable('outreach_campaigns').onDelete('CASCADE');
    t.uuid('candidate_user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.string('candidate_name').notNullable();
    t.string('candidate_email').nullable();
    t.enu('status', ['pending', 'sent', 'opened', 'replied', 'bounced', 'unsubscribed']).notNullable().defaultTo('pending');
    t.timestamp('sent_at').nullable();
    t.timestamps(true, true);
    t.index(['campaign_id', 'status'], 'campaign_audiences_campaign_status_idx');
  });

  await knex.schema.createTable('campaign_variants', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('campaign_id').notNullable().references('id').inTable('outreach_campaigns').onDelete('CASCADE');
    t.string('variant_label', 8).notNullable();
    t.string('subject').nullable();
    t.text('body').notNullable();
    t.decimal('send_pct', 5, 2).nullable();
    t.integer('sent_count').notNullable().defaultTo(0);
    t.integer('reply_count').notNullable().defaultTo(0);
    t.timestamps(true, true);
    t.index(['campaign_id'], 'campaign_variants_campaign_idx');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('campaign_variants');
  await knex.schema.dropTableIfExists('campaign_audiences');
  await knex.schema.dropTableIfExists('outreach_campaigns');
  await knex.schema.dropTableIfExists('outreach_templates');
}
