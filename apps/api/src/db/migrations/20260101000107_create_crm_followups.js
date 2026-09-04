// Domain 24 §21: relationship-focused follow-up/task record, distinct from
// a generic task list — always tied to a CRM object and surfaced on both the
// Follow-Ups page and CRM Home's "upcoming follow-ups" list.
export async function up(knex) {
  await knex.schema.createTable('crm_followups', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.enu('owner_type', ['user', 'company']).notNullable().defaultTo('user');
    t.uuid('owner_id').notNullable();
    t.uuid('workspace_id').nullable().references('id').inTable('companies').onDelete('SET NULL');

    t.enu('object_type', ['contact', 'lead', 'account', 'opportunity']).notNullable();
    t.uuid('object_id').notNullable();

    t.enu('type', [
      'call', 'email', 'message', 'meeting', 'check_in',
      'proposal', 'contract', 'relationship_touch', 'custom',
    ]).notNullable().defaultTo('relationship_touch');
    t.timestamp('due_at').notNullable();
    t.enu('priority', ['low', 'medium', 'high']).notNullable().defaultTo('medium');
    t.uuid('owner_user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.enu('status', ['open', 'done', 'snoozed']).notNullable().defaultTo('open');
    t.text('reason');
    t.boolean('ai_recommended').notNullable().defaultTo(false);
    t.timestamp('completed_at');

    t.timestamps(true, true);
  });

  await knex.schema.alterTable('crm_followups', (t) => {
    t.index(['owner_type', 'owner_id']);
    t.index(['object_type', 'object_id']);
    t.index(['due_at']);
    t.index(['status']);
    t.index(['owner_user_id']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('crm_followups');
}
