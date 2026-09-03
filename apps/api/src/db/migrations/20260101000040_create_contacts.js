// Domain 04 §12: canonical contacts table for imported/manual external
// people. Not the same as `connections` (in-network platform-user
// relationships). Index (not unique) on owner_id+email_normalized — dedupe
// is a reviewed decision (import_dedupe_matches), never a DB constraint.
export async function up(knex) {
  await knex.schema.createTable('contacts', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.enu('owner_type', ['user', 'company']).notNullable().defaultTo('user');
    t.uuid('owner_id').notNullable();
    t.uuid('workspace_id').nullable().references('id').inTable('companies').onDelete('SET NULL');
    t.string('first_name').nullable();
    t.string('last_name').nullable();
    t.string('email_normalized').nullable();
    t.string('phone_normalized').nullable();
    t.string('company_name').nullable();
    t.string('title').nullable();
    t.string('location').nullable();
    t.jsonb('tags').notNullable().defaultTo('[]');
    t.enu('source', ['manual', 'import']).notNullable().defaultTo('manual');
    t.uuid('import_id').nullable().references('id').inTable('imports').onDelete('SET NULL');
    t.uuid('import_row_id').nullable().references('id').inTable('import_rows').onDelete('SET NULL');
    t.timestamps(true, true);
  });
  await knex.schema.alterTable('contacts', (t) => {
    t.index(['owner_id', 'email_normalized']);
    t.index(['owner_type', 'owner_id']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('contacts');
}
