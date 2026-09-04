// Domain 24 §32: saved filter/sort/column configurations for collection
// pages, shared across Contacts/Leads/Accounts/Opportunities/Segments.
export async function up(knex) {
  await knex.schema.createTable('crm_saved_views', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.enu('owner_type', ['user', 'company']).notNullable().defaultTo('user');
    t.uuid('owner_id').notNullable();
    t.uuid('workspace_id').nullable().references('id').inTable('companies').onDelete('SET NULL');

    t.enu('object_type', ['contact', 'lead', 'account', 'opportunity']).notNullable();
    t.uuid('owner_user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.enu('visibility', ['private', 'team', 'workspace']).notNullable().defaultTo('private');

    t.string('name').notNullable();
    t.jsonb('filter_json').notNullable().defaultTo('{}');
    t.jsonb('sort_json').notNullable().defaultTo('{}');
    t.jsonb('column_json').notNullable().defaultTo('[]');
    t.string('view_mode').notNullable().defaultTo('table');
    t.boolean('is_default').notNullable().defaultTo(false);

    t.timestamps(true, true);
  });

  await knex.schema.alterTable('crm_saved_views', (t) => {
    t.index(['owner_type', 'owner_id', 'object_type']);
    t.index(['owner_user_id']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('crm_saved_views');
}
