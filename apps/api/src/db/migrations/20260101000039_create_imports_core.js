// Domain 04 §36-40/§48/§15/§20: imports pipeline core tables. Enum values on
// import_files mirror the pipeline state machine exactly — a file is never
// readable by any downstream stage until scan_status = 'clean'.
export async function up(knex) {
  await knex.schema.createTable('imports', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.enu('owner_type', ['user', 'company']).notNullable().defaultTo('user');
    t.uuid('owner_id').notNullable();
    t.uuid('workspace_id').nullable().references('id').inTable('companies').onDelete('SET NULL');
    t.enu('import_type', ['cv', 'profile', 'company', 'contacts']).notNullable();
    t.enu('status', [
      'draft',
      'uploading',
      'scanning',
      'parsing',
      'mapping',
      'validating',
      'ready_to_commit',
      'committing',
      'completed',
      'failed',
      'cancelled',
    ])
      .notNullable()
      .defaultTo('draft');
    t.string('source').nullable(); // 'upload' | 'url' (future)
    t.jsonb('summary_json').notNullable().defaultTo('{}');
    t.uuid('created_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.timestamp('committed_at').nullable();
    t.timestamp('cancelled_at').nullable();
    t.timestamps(true, true);
  });
  await knex.schema.alterTable('imports', (t) => {
    t.index(['owner_type', 'owner_id']);
    t.index(['status']);
  });

  await knex.schema.createTable('import_files', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('import_id').notNullable().references('id').inTable('imports').onDelete('CASCADE');
    t.string('original_filename').notNullable();
    t.string('safe_display_name').notNullable();
    t.string('storage_key').notNullable(); // quarantine/ or imports/ key
    t.string('sanitized_storage_key').nullable();
    t.string('mime_type_declared').nullable();
    t.string('mime_type_detected').nullable();
    t.bigInteger('size_bytes').nullable();
    t.string('sha256').nullable();
    t.enu('upload_status', [
      'pending',
      'uploading',
      'uploaded',
      'quarantined',
      'scanning',
      'scan_failed',
      'sanitizing',
      'ready_for_parse',
      'parsing',
      'parsed',
      'needs_review',
      'failed',
      'imported',
    ])
      .notNullable()
      .defaultTo('pending');
    t.enu('scan_status', ['pending', 'clean', 'infected', 'suspicious', 'error']).notNullable().defaultTo('pending');
    t.string('scanner').nullable(); // 'baseline-heuristic' | 'clamav'
    t.jsonb('scan_details').notNullable().defaultTo('{}');
    t.enu('sanitization_status', ['pending', 'not_needed', 'sanitized', 'failed']).notNullable().defaultTo('pending');
    t.enu('parser_status', ['pending', 'parsing', 'parsed', 'failed']).notNullable().defaultTo('pending');
    t.text('parser_error').nullable();
    t.uuid('original_asset_id').nullable();
    t.uuid('sanitized_asset_id').nullable();
    t.timestamps(true, true);
  });
  await knex.schema.alterTable('import_files', (t) => {
    t.index(['import_id']);
    t.index(['sha256']);
    t.index(['scan_status']);
    t.index(['parser_status']);
  });

  await knex.schema.createTable('import_rows', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('import_id').notNullable().references('id').inTable('imports').onDelete('CASCADE');
    t.uuid('import_file_id').nullable().references('id').inTable('import_files').onDelete('CASCADE');
    t.integer('row_number').nullable();
    t.jsonb('raw_json').notNullable().defaultTo('{}');
    t.jsonb('normalized_json').notNullable().defaultTo('{}');
    t.enu('status', ['pending', 'mapped', 'validated', 'needs_review', 'duplicate', 'committed', 'failed', 'skipped'])
      .notNullable()
      .defaultTo('pending');
    t.text('error_message').nullable();
    t.string('committed_entity_type').nullable();
    t.uuid('committed_entity_id').nullable();
    t.timestamps(true, true);
  });
  await knex.schema.alterTable('import_rows', (t) => {
    t.index(['import_id']);
    t.index(['import_file_id']);
    t.index(['status']);
  });

  await knex.schema.createTable('import_field_mappings', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('import_id').notNullable().references('id').inTable('imports').onDelete('CASCADE');
    t.uuid('import_file_id').nullable().references('id').inTable('import_files').onDelete('CASCADE');
    t.string('source_column').notNullable();
    t.string('target_field').nullable(); // must be validated against server-side allowlist per import_type
    t.float('confidence').nullable();
    t.string('model_name').nullable();
    t.string('model_version').nullable();
    t.boolean('is_manual_override').notNullable().defaultTo(false);
    t.timestamps(true, true);
  });
  await knex.schema.alterTable('import_field_mappings', (t) => {
    t.index(['import_id']);
    t.index(['import_file_id']);
  });

  await knex.schema.createTable('import_dedupe_matches', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('import_id').notNullable().references('id').inTable('imports').onDelete('CASCADE');
    t.uuid('import_row_id').notNullable().references('id').inTable('import_rows').onDelete('CASCADE');
    t.string('candidate_entity_type').notNullable(); // 'contact' | 'company' | 'profile'
    t.uuid('candidate_entity_id').notNullable();
    t.float('match_score').notNullable().defaultTo(0);
    t.jsonb('match_reason_codes').notNullable().defaultTo('[]');
    t.enu('decision', ['pending', 'merge', 'link', 'create_new', 'ignore']).notNullable().defaultTo('pending');
    t.uuid('decided_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('decided_at').nullable();
    t.string('model_name').nullable();
    t.string('model_version').nullable();
    t.timestamps(true, true);
  });
  await knex.schema.alterTable('import_dedupe_matches', (t) => {
    t.index(['import_id']);
    t.index(['import_row_id']);
    t.index(['decision']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('import_dedupe_matches');
  await knex.schema.dropTableIfExists('import_field_mappings');
  await knex.schema.dropTableIfExists('import_rows');
  await knex.schema.dropTableIfExists('import_files');
  await knex.schema.dropTableIfExists('imports');
}
