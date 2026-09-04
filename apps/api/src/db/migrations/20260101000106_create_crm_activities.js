// Domain 24 §29/§43: shared relationship timeline used by every detail page
// (contact/lead/account/opportunity) and doubling as the audit trail for
// consequential mutations, matching the activity-rows-as-audit-trail
// convention already used elsewhere in this repo (Domain 18 projects).
export async function up(knex) {
  await knex.schema.createTable('crm_activities', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.enu('owner_type', ['user', 'company']).notNullable().defaultTo('user');
    t.uuid('owner_id').notNullable();
    t.uuid('workspace_id').nullable().references('id').inTable('companies').onDelete('SET NULL');

    t.enu('object_type', ['contact', 'lead', 'account', 'opportunity']).notNullable();
    t.uuid('object_id').notNullable();
    t.uuid('actor_id').nullable().references('id').inTable('users').onDelete('SET NULL');

    t.enu('activity_type', [
      'note', 'email', 'message', 'call', 'meeting', 'file',
      'stage_change', 'owner_change', 'enrichment', 'followup', 'system_event',
    ]).notNullable();
    t.enu('direction', ['inbound', 'outbound', 'internal']).notNullable().defaultTo('internal');

    t.string('subject');
    t.text('summary');
    t.timestamp('occurred_at').notNullable().defaultTo(knex.fn.now());
    t.jsonb('metadata_jsonb').notNullable().defaultTo('{}');

    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.alterTable('crm_activities', (t) => {
    t.index(['object_type', 'object_id', 'occurred_at']);
    t.index(['owner_type', 'owner_id']);
    t.index(['workspace_id']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('crm_activities');
}
