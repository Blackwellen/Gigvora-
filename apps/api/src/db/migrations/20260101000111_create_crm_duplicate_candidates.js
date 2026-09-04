// Domain 24 §31: duplicate-resolution workflow, surfaced on the Enrichment
// Queue page. A resolved merge writes an immutable crm_activities row
// (activity_type='system_event', metadata_jsonb.action='merge') as its
// history rather than a parallel merge-history table.
export async function up(knex) {
  await knex.schema.createTable('crm_duplicate_candidates', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.enu('owner_type', ['user', 'company']).notNullable().defaultTo('user');
    t.uuid('owner_id').notNullable();
    t.uuid('workspace_id').nullable().references('id').inTable('companies').onDelete('SET NULL');

    t.enu('object_type', ['contact', 'lead', 'account']).notNullable();
    t.uuid('record_a_id').notNullable();
    t.uuid('record_b_id').notNullable();

    t.integer('match_score').notNullable();
    t.jsonb('match_features_jsonb').notNullable().defaultTo('{}');
    t.string('model_version').notNullable().defaultTo('heuristic-v1');

    t.enu('resolution_status', ['pending', 'merged', 'kept_separate', 'linked', 'ignored']).notNullable().defaultTo('pending');
    t.uuid('resolved_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.string('resolution_action');
    t.timestamp('resolved_at');

    t.timestamps(true, true);
  });

  await knex.schema.alterTable('crm_duplicate_candidates', (t) => {
    t.index(['owner_type', 'owner_id']);
    t.index(['object_type', 'resolution_status']);
    t.unique(['object_type', 'record_a_id', 'record_b_id']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('crm_duplicate_candidates');
}
