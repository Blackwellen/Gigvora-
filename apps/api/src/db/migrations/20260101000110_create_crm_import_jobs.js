// Domain 24 §19: CRM-specific import pipeline (field mapping targets CRM
// fields), mirroring the shape of the existing `imports`/`import_rows`
// tables used by the personal-contacts importer, kept separate so mapping
// configs don't collide across the two importers.
export async function up(knex) {
  await knex.schema.createTable('crm_import_jobs', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.enu('owner_type', ['user', 'company']).notNullable().defaultTo('user');
    t.uuid('owner_id').notNullable();
    t.uuid('workspace_id').nullable().references('id').inTable('companies').onDelete('SET NULL');
    t.uuid('created_by').nullable().references('id').inTable('users').onDelete('SET NULL');

    t.string('source').notNullable().defaultTo('csv');
    t.string('file_name');
    t.string('object_key');
    t.integer('file_size_bytes');

    t.jsonb('field_mapping_jsonb').notNullable().defaultTo('{}');
    t.jsonb('ownership_defaults_jsonb').notNullable().defaultTo('{}');

    t.enu('status', ['uploaded', 'mapping', 'validating', 'reviewing', 'processing', 'completed', 'failed', 'cancelled']).notNullable().defaultTo('uploaded');

    t.integer('total_rows').notNullable().defaultTo(0);
    t.integer('created_count').notNullable().defaultTo(0);
    t.integer('updated_count').notNullable().defaultTo(0);
    t.integer('skipped_count').notNullable().defaultTo(0);
    t.integer('failed_count').notNullable().defaultTo(0);
    t.integer('duplicate_count').notNullable().defaultTo(0);

    t.timestamp('completed_at');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('crm_import_rows', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('import_job_id').notNullable().references('id').inTable('crm_import_jobs').onDelete('CASCADE');
    t.integer('row_number').notNullable();
    t.jsonb('raw_jsonb').notNullable().defaultTo('{}');
    t.enu('status', ['pending', 'matched', 'created', 'updated', 'skipped', 'failed']).notNullable().defaultTo('pending');
    t.string('match_type');
    t.text('error_message');
    t.uuid('created_record_id');
    t.timestamps(true, true);
  });

  await knex.schema.alterTable('crm_import_jobs', (t) => {
    t.index(['owner_type', 'owner_id']);
  });
  await knex.schema.alterTable('crm_import_rows', (t) => {
    t.index(['import_job_id', 'status']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('crm_import_rows');
  await knex.schema.dropTableIfExists('crm_import_jobs');
}
