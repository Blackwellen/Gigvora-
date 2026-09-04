// Domain 24 §1: CRM account = an organisation the workspace has a commercial
// relationship with. May link to a canonical `companies` row (organisation_id)
// or represent a fully external/prospect company — never forces duplication
// of canonical company data, only overlays relationship-management fields.
export async function up(knex) {
  await knex.schema.createTable('crm_accounts', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.enu('owner_type', ['user', 'company']).notNullable().defaultTo('user');
    t.uuid('owner_id').notNullable();
    t.uuid('workspace_id').nullable().references('id').inTable('companies').onDelete('SET NULL');
    t.uuid('organisation_id').nullable().references('id').inTable('companies').onDelete('SET NULL');

    t.string('name').notNullable();
    t.string('legal_name');
    t.string('domain');
    t.string('website');
    t.string('logo_url');
    t.text('description');

    t.string('industry');
    t.string('employee_band');
    t.string('revenue_band');
    t.string('currency').defaultTo('GBP');
    t.integer('founded_year');
    t.string('headquarters_location');
    t.string('country_code');

    t.enu('account_tier', ['strategic', 'key', 'standard', 'prospect']).notNullable().defaultTo('prospect');
    t.enu('lifecycle_stage', ['prospect', 'active', 'customer', 'churned']).notNullable().defaultTo('prospect');
    t.uuid('owner_user_id').nullable().references('id').inTable('users').onDelete('SET NULL');

    t.integer('relationship_health_score');
    t.integer('engagement_score');
    t.decimal('open_pipeline_value', 14, 2).notNullable().defaultTo(0);
    t.decimal('won_revenue', 14, 2).notNullable().defaultTo(0);

    t.timestamp('first_interaction_at');
    t.timestamp('last_interaction_at');
    t.timestamp('next_followup_at');

    t.enu('enrichment_status', ['none', 'queued', 'processing', 'completed', 'review_required', 'failed']).notNullable().defaultTo('none');
    t.enu('canonical_match_status', ['unmatched', 'suggested', 'linked']).notNullable().defaultTo('unmatched');

    t.jsonb('technology_jsonb').notNullable().defaultTo('[]');
    t.jsonb('social_links_jsonb').notNullable().defaultTo('{}');
    t.jsonb('tags').notNullable().defaultTo('[]');

    t.timestamp('archived_at');
    t.timestamps(true, true);
  });

  await knex.schema.alterTable('crm_accounts', (t) => {
    t.index(['owner_type', 'owner_id']);
    t.index(['workspace_id']);
    t.index(['domain']);
    t.index(['organisation_id']);
    t.index(['account_tier']);
    t.index(['updated_at']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('crm_accounts');
}
