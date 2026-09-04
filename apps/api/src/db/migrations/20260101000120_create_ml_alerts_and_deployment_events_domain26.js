// Domain 26 — operational alerts and the deployment/lifecycle event log. ml_deployment_events
// deliberately doubles as both the "Deployment History" timeline (spec §81) and the audit trail
// for consequential registry actions (register/promote/rollback/deprecate — spec §63/§74): no
// generic admin audit_log table exists yet in this codebase (checked), and every field the audit
// requirement asks for (actor, before/after via traffic_percent+stage on the version, reason,
// timestamp) already has a natural home on this table, so a second parallel audit table would be
// pure duplication.
export async function up(knex) {
  await knex.schema.createTable('ml_alerts', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.enu('alert_type', [
      'latency',
      'error_rate',
      'feature_stale',
      'drift',
      'quality_regression',
      'calibration',
      'endpoint_unhealthy',
      'embedding_backlog',
      'fraud_fp_spike',
      'parser_failure',
    ]).notNullable();
    t.enu('severity', ['info', 'low', 'medium', 'high', 'critical']).notNullable().defaultTo('medium');
    t.uuid('model_registry_id').nullable().references('id').inTable('model_registry').onDelete('CASCADE');
    t.uuid('feature_definition_id').nullable().references('id').inTable('ml_feature_definitions').onDelete('CASCADE');
    t.string('title').notNullable();
    t.text('description').nullable();
    t.enu('status', ['open', 'acknowledged', 'investigating', 'resolved', 'muted']).notNullable().defaultTo('open');
    t.uuid('acknowledged_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('detected_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('resolved_at').nullable();
    t.timestamps(true, true);
    t.index(['status', 'severity']);
  });

  await knex.schema.createTable('ml_deployment_events', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('model_registry_id').notNullable().references('id').inTable('model_registry').onDelete('CASCADE');
    t.uuid('model_version_id').nullable().references('id').inTable('ml_model_versions').onDelete('SET NULL');
    t.enu('event_type', [
      'registered',
      'version_created',
      'trained',
      'evaluated',
      'approved',
      'candidate_ready',
      'canary_started',
      'traffic_expanded',
      'promoted_production',
      'rolled_back',
      'deprecated',
      'archived',
    ]).notNullable();
    t.decimal('traffic_percent', 5, 2).nullable();
    t.uuid('actor_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.text('reason').nullable();
    t.enu('environment', ['development', 'staging', 'production']).notNullable().defaultTo('production');
    t.jsonb('before').notNullable().defaultTo('{}');
    t.jsonb('after').notNullable().defaultTo('{}');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['model_registry_id', 'created_at']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('ml_deployment_events');
  await knex.schema.dropTableIfExists('ml_alerts');
}
