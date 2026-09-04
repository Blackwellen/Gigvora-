// Domain 24 §18/§32: reusable dynamic or static cohorts. Rules are stored
// as normalized rows (crm_segment_rules) so the builder UI and the /preview
// evaluator both read a structured shape rather than parsing free-form JSON.
export async function up(knex) {
  await knex.schema.createTable('crm_segments', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.enu('owner_type', ['user', 'company']).notNullable().defaultTo('user');
    t.uuid('owner_id').notNullable();
    t.uuid('workspace_id').nullable().references('id').inTable('companies').onDelete('SET NULL');

    t.string('name').notNullable();
    t.text('description');
    t.enu('object_type', ['contact', 'lead', 'account']).notNullable().defaultTo('contact');
    t.enu('segment_type', ['dynamic', 'static']).notNullable().defaultTo('dynamic');
    t.integer('member_count_cached').notNullable().defaultTo(0);
    t.uuid('owner_user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('last_recalculated_at');

    t.timestamps(true, true);
  });

  await knex.schema.createTable('crm_segment_rules', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('segment_id').notNullable().references('id').inTable('crm_segments').onDelete('CASCADE');
    t.string('field').notNullable();
    t.string('operator').notNullable();
    t.jsonb('value').notNullable().defaultTo('null');
    t.enu('group_logic', ['and', 'or']).notNullable().defaultTo('and');
    t.integer('group_index').notNullable().defaultTo(0);
    t.integer('order_index').notNullable().defaultTo(0);
  });

  await knex.schema.alterTable('crm_segments', (t) => {
    t.index(['owner_type', 'owner_id']);
  });
  await knex.schema.alterTable('crm_segment_rules', (t) => {
    t.index(['segment_id']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('crm_segment_rules');
  await knex.schema.dropTableIfExists('crm_segments');
}
