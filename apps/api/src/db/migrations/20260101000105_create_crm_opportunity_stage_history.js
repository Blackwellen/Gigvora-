// Domain 24 §29: append-only stage-movement log, separate from the general
// crm_activities timeline so Opportunity Detail's "Stage History" tab and
// velocity analytics can query it directly without filtering activity rows.
export async function up(knex) {
  await knex.schema.createTable('crm_opportunity_stage_history', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('opportunity_id').notNullable().references('id').inTable('crm_opportunities').onDelete('CASCADE');
    t.uuid('from_stage_id').nullable().references('id').inTable('crm_pipeline_stages').onDelete('SET NULL');
    t.uuid('to_stage_id').notNullable().references('id').inTable('crm_pipeline_stages').onDelete('CASCADE');
    t.uuid('changed_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('changed_at').notNullable().defaultTo(knex.fn.now());
    t.string('reason');
  });

  await knex.schema.alterTable('crm_opportunity_stage_history', (t) => {
    t.index(['opportunity_id', 'changed_at']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('crm_opportunity_stage_history');
}
