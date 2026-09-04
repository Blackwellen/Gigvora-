// Domain 24 §13/§28: pipeline stages are workspace-configurable rather than
// a hardcoded enum, so a business can rename/reorder stages without a
// migration. Seeded with 8 sane defaults per workspace by the domain seed.
export async function up(knex) {
  await knex.schema.createTable('crm_pipeline_stages', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.enu('owner_type', ['user', 'company']).notNullable().defaultTo('user');
    t.uuid('owner_id').notNullable();
    t.uuid('workspace_id').nullable().references('id').inTable('companies').onDelete('SET NULL');

    t.string('key').notNullable();
    t.string('label').notNullable();
    t.integer('order_index').notNullable().defaultTo(0);
    t.boolean('is_won').notNullable().defaultTo(false);
    t.boolean('is_lost').notNullable().defaultTo(false);
    t.string('color').defaultTo('blue');

    t.timestamps(true, true);
  });

  await knex.schema.alterTable('crm_pipeline_stages', (t) => {
    t.index(['owner_type', 'owner_id']);
    t.unique(['owner_type', 'owner_id', 'key']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('crm_pipeline_stages');
}
