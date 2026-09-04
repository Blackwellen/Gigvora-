// Domain 24 §30: many-to-many buying-group model. A contact can hold a
// CRM-specific role at an account (champion, decision maker, etc.) without
// ever overwriting canonical employment data elsewhere in the platform.
export async function up(knex) {
  await knex.schema.createTable('crm_account_contact_roles', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('account_id').notNullable().references('id').inTable('crm_accounts').onDelete('CASCADE');
    t.uuid('contact_id').notNullable().references('id').inTable('crm_contacts').onDelete('CASCADE');

    t.string('relationship_type');
    t.string('job_title_at_account');
    t.string('department');
    t.string('seniority');
    t.boolean('is_primary').notNullable().defaultTo(false);

    t.date('started_at');
    t.date('ended_at');

    t.enu('buying_role', ['champion', 'decision_maker', 'influencer', 'user', 'procurement', 'blocker']).nullable();
    t.string('influence_level');
    t.string('relationship_strength');

    t.timestamps(true, true);
  });

  await knex.schema.alterTable('crm_account_contact_roles', (t) => {
    t.index(['account_id']);
    t.index(['contact_id']);
    t.unique(['account_id', 'contact_id']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('crm_account_contact_roles');
}
