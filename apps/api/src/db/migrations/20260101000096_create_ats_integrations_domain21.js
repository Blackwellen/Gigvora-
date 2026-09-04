/**
 * Domain 21: Recruiter Pro — external ATS integrations (Greenhouse, Lever,
 * Workday, BambooHR, iCIMS): connections, field mappings and sync run logs.
 */
export async function up(knex) {
  await knex.schema.createTable('ats_connections', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE');
    t.enu('provider', ['greenhouse', 'lever', 'workday', 'bamboohr', 'icims']).notNullable();
    t.enu('status', ['healthy', 'degraded', 'disconnected', 'pending']).notNullable().defaultTo('pending');
    t.string('external_account_name').nullable();
    t.timestamp('last_synced_at').nullable();
    t.integer('sync_frequency_minutes').notNullable().defaultTo(60);
    t.uuid('created_by_user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);
    t.index(['company_id', 'status'], 'ats_connections_company_status_idx');
  });

  await knex.schema.createTable('ats_field_mappings', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('connection_id').notNullable().references('id').inTable('ats_connections').onDelete('CASCADE');
    t.string('local_field').notNullable();
    t.string('remote_field').notNullable();
    t.enu('entity_type', ['candidate', 'job', 'application', 'interview']).notNullable();
    t.timestamps(true, true);
    t.index(['connection_id'], 'ats_field_mappings_connection_idx');
  });

  await knex.schema.createTable('ats_sync_runs', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('connection_id').notNullable().references('id').inTable('ats_connections').onDelete('CASCADE');
    t.enu('status', ['running', 'completed', 'failed', 'partial']).notNullable().defaultTo('running');
    t.timestamp('started_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('finished_at').nullable();
    t.integer('records_synced').notNullable().defaultTo(0);
    t.integer('records_failed').notNullable().defaultTo(0);
    t.text('error_summary').nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['connection_id', 'status'], 'ats_sync_runs_connection_status_idx');
  });

  await knex.schema.createTable('ats_sync_events', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('sync_run_id').notNullable().references('id').inTable('ats_sync_runs').onDelete('CASCADE');
    t.string('entity_type').notNullable();
    t.string('entity_external_id').nullable();
    t.enu('action', ['created', 'updated', 'skipped', 'failed']).notNullable();
    t.text('message').nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['sync_run_id'], 'ats_sync_events_run_idx');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('ats_sync_events');
  await knex.schema.dropTableIfExists('ats_sync_runs');
  await knex.schema.dropTableIfExists('ats_field_mappings');
  await knex.schema.dropTableIfExists('ats_connections');
}
