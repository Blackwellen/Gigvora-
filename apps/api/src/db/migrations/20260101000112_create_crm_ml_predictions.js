// Domain 24 §40/§41: one generic table for every heuristic "AI/ML" score in
// the CRM module (lead fit/intent, opportunity close, relationship health,
// duplicate match, next-best-action). Every prediction is versioned,
// explainable and overridable rather than being a bare unaudited number.
export async function up(knex) {
  await knex.schema.createTable('crm_ml_predictions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.enu('owner_type', ['user', 'company']).notNullable().defaultTo('user');
    t.uuid('owner_id').notNullable();
    t.uuid('workspace_id').nullable().references('id').inTable('companies').onDelete('SET NULL');

    t.enu('object_type', ['contact', 'lead', 'account', 'opportunity']).notNullable();
    t.uuid('object_id').notNullable();
    t.enu('capability', [
      'lead_fit', 'lead_intent', 'opportunity_close', 'relationship_health',
      'duplicate_match', 'next_best_action',
    ]).notNullable();

    t.string('model_name').notNullable().defaultTo('gigvora-crm-heuristics');
    t.string('model_version').notNullable().defaultTo('heuristic-v1');

    t.integer('score').notNullable();
    t.integer('confidence');
    t.string('input_feature_snapshot_hash');
    t.jsonb('explanation_jsonb').notNullable().defaultTo('{}');

    t.timestamp('generated_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('expires_at');

    t.integer('override_value');
    t.uuid('override_actor_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.text('override_reason');
  });

  await knex.schema.alterTable('crm_ml_predictions', (t) => {
    t.index(['object_type', 'object_id', 'capability', 'generated_at']);
    t.index(['owner_type', 'owner_id']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('crm_ml_predictions');
}
