// Domain 24 §2: CRM contact = a person the workspace has a relationship
// with. May link to a canonical `users` row (professional_id) or represent a
// fully external person. Backs both the Contacts (24.02) and the
// post-conversion side of Leads (24.03) — one shared identity, no
// duplication, per the domain goal.
export async function up(knex) {
  await knex.schema.createTable('crm_contacts', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.enu('owner_type', ['user', 'company']).notNullable().defaultTo('user');
    t.uuid('owner_id').notNullable();
    t.uuid('workspace_id').nullable().references('id').inTable('companies').onDelete('SET NULL');
    t.uuid('professional_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.uuid('account_id').nullable().references('id').inTable('crm_accounts').onDelete('SET NULL');

    t.string('first_name');
    t.string('last_name');
    t.string('display_name');
    t.string('job_title');
    t.string('department');
    t.string('seniority');

    t.jsonb('emails_jsonb').notNullable().defaultTo('[]');
    t.string('email_normalized');
    t.jsonb('phones_jsonb').notNullable().defaultTo('[]');
    t.string('phone_normalized');

    t.string('location_text');
    t.string('country_code');
    t.string('city');
    t.string('timezone');

    t.string('relationship_type');
    t.enu('lifecycle_stage', ['lead', 'contact', 'customer']).notNullable().defaultTo('contact');
    t.uuid('owner_user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.string('source');
    t.string('source_detail');

    t.integer('relationship_health_score');
    t.string('relationship_health_band');
    t.integer('engagement_score');

    t.timestamp('first_interaction_at');
    t.timestamp('last_interaction_at');
    t.timestamp('next_followup_at');
    t.integer('interaction_count').notNullable().defaultTo(0);
    t.string('preferred_channel');

    t.string('avatar_url');

    t.enu('enrichment_status', ['none', 'queued', 'processing', 'completed', 'review_required', 'failed']).notNullable().defaultTo('none');
    t.integer('enrichment_confidence');
    t.enu('canonical_match_status', ['unmatched', 'suggested', 'linked']).notNullable().defaultTo('unmatched');

    t.enu('consent_status', ['unknown', 'granted', 'withdrawn']).notNullable().defaultTo('unknown');
    t.boolean('do_not_contact').notNullable().defaultTo(false);

    t.jsonb('tags').notNullable().defaultTo('[]');

    t.timestamp('archived_at');
    t.timestamps(true, true);
  });

  await knex.schema.alterTable('crm_contacts', (t) => {
    t.index(['owner_type', 'owner_id']);
    t.index(['workspace_id']);
    t.index(['account_id']);
    t.index(['email_normalized']);
    t.index(['phone_normalized']);
    t.index(['lifecycle_stage']);
    t.index(['next_followup_at']);
    t.index(['updated_at']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('crm_contacts');
}
