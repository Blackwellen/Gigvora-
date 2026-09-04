// Domain 24 §26: leads are pre-qualification records, distinct from
// crm_contacts so unqualified/unresolved identities never pollute the
// established contact book. Conversion links forward into crm_contacts /
// crm_accounts / crm_opportunities and never duplicates data once resolved.
export async function up(knex) {
  await knex.schema.createTable('crm_leads', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.enu('owner_type', ['user', 'company']).notNullable().defaultTo('user');
    t.uuid('owner_id').notNullable();
    t.uuid('workspace_id').nullable().references('id').inTable('companies').onDelete('SET NULL');

    t.uuid('contact_id').nullable().references('id').inTable('crm_contacts').onDelete('SET NULL');
    t.uuid('account_id').nullable().references('id').inTable('crm_accounts').onDelete('SET NULL');
    t.uuid('professional_id').nullable().references('id').inTable('users').onDelete('SET NULL');

    t.string('first_name');
    t.string('last_name');
    t.string('display_name');
    t.string('email_normalized');
    t.string('phone_normalized');

    t.string('job_title');
    t.string('company_name');
    t.string('location');

    t.enu('lead_status', ['new', 'working', 'qualified', 'nurture', 'converted', 'disqualified']).notNullable().defaultTo('new');

    t.string('lead_source');
    t.string('utm_source');
    t.string('utm_medium');
    t.string('utm_campaign');
    t.string('referrer');

    t.uuid('owner_user_id').nullable().references('id').inTable('users').onDelete('SET NULL');

    t.integer('fit_score');
    t.integer('intent_score');
    t.integer('engagement_score');
    t.integer('qualification_score');
    t.string('buying_role_prediction');
    t.enu('lead_temperature', ['cold', 'warm', 'hot']).notNullable().defaultTo('cold');

    t.timestamp('last_activity_at');
    t.timestamp('next_followup_at');

    t.enu('enrichment_status', ['none', 'queued', 'processing', 'completed', 'review_required', 'failed']).notNullable().defaultTo('none');
    t.integer('duplicate_risk_score');

    t.timestamp('converted_at');
    t.uuid('converted_contact_id').nullable().references('id').inTable('crm_contacts').onDelete('SET NULL');
    t.uuid('converted_account_id').nullable().references('id').inTable('crm_accounts').onDelete('SET NULL');
    t.uuid('converted_opportunity_id');

    t.timestamp('disqualified_at');
    t.string('disqualification_reason');

    t.timestamps(true, true);
  });

  await knex.schema.alterTable('crm_leads', (t) => {
    t.index(['owner_type', 'owner_id']);
    t.index(['workspace_id']);
    t.index(['lead_status']);
    t.index(['email_normalized']);
    t.index(['owner_user_id']);
    t.index(['next_followup_at']);
    t.index(['updated_at']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('crm_leads');
}
