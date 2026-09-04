// Domain 24 §28: the deal object. weighted_value is a stored generated
// column (value * probability / 100) so sort/filter/aggregate queries never
// need to recompute it in application code.
export async function up(knex) {
  await knex.schema.createTable('crm_opportunities', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.enu('owner_type', ['user', 'company']).notNullable().defaultTo('user');
    t.uuid('owner_id').notNullable();
    t.uuid('workspace_id').nullable().references('id').inTable('companies').onDelete('SET NULL');

    t.uuid('account_id').notNullable().references('id').inTable('crm_accounts').onDelete('CASCADE');
    t.uuid('stage_id').notNullable().references('id').inTable('crm_pipeline_stages').onDelete('RESTRICT');
    t.uuid('owner_user_id').nullable().references('id').inTable('users').onDelete('SET NULL');

    t.string('name').notNullable();
    t.decimal('value', 14, 2).notNullable().defaultTo(0);
    t.string('currency').notNullable().defaultTo('GBP');
    t.integer('probability').notNullable().defaultTo(10);

    t.enu('forecast_category', ['pipeline', 'best_case', 'commit', 'closed']).notNullable().defaultTo('pipeline');
    t.date('expected_close_date');
    t.date('actual_close_date');

    t.string('opportunity_type');
    t.string('source');
    t.string('product_service');

    t.uuid('primary_contact_id').nullable().references('id').inTable('crm_contacts').onDelete('SET NULL');
    t.uuid('champion_contact_id').nullable().references('id').inTable('crm_contacts').onDelete('SET NULL');
    t.uuid('decision_maker_contact_id').nullable().references('id').inTable('crm_contacts').onDelete('SET NULL');
    t.uuid('economic_buyer_contact_id').nullable().references('id').inTable('crm_contacts').onDelete('SET NULL');

    t.integer('relationship_health_score');
    t.integer('ai_close_score');
    t.integer('ai_close_confidence');

    t.text('next_step');
    t.timestamp('next_step_due_at');

    t.string('loss_reason');
    t.string('win_reason');

    t.integer('board_order').notNullable().defaultTo(0);
    t.timestamp('closed_at');

    t.timestamps(true, true);
  });

  await knex.raw(`
    ALTER TABLE crm_opportunities
    ADD COLUMN weighted_value NUMERIC(14,2) GENERATED ALWAYS AS (value * probability / 100.0) STORED
  `);

  await knex.schema.alterTable('crm_opportunities', (t) => {
    t.index(['owner_type', 'owner_id']);
    t.index(['workspace_id']);
    t.index(['account_id']);
    t.index(['stage_id']);
    t.index(['owner_user_id']);
    t.index(['forecast_category']);
    t.index(['expected_close_date']);
    t.index(['updated_at']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('crm_opportunities');
}
