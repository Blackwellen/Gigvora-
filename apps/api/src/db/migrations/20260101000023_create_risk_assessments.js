export async function up(knex) {
  await knex.schema.createTable('risk_assessments', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');
    t.uuid('session_id');
    t.uuid('auth_attempt_id').references('id').inTable('auth_attempts').onDelete('SET NULL');
    t.string('assessment_type').notNullable();
    t.string('model_name').notNullable();
    t.string('model_version').notNullable();
    t.string('feature_schema_version').notNullable().defaultTo('v1');
    t.decimal('raw_score', 6, 5);
    t.decimal('calibrated_score', 6, 5);
    t.enu('risk_band', ['low', 'medium', 'high', 'critical']).notNullable();
    t.jsonb('explanation').notNullable().defaultTo('{}');
    t.string('policy_decision').notNullable();
    t.string('policy_version').notNullable().defaultTo('v1');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['user_id']);
    t.index(['assessment_type']);
    t.index(['created_at']);
  });

  await knex.schema.createTable('security_policy_decisions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');
    t.uuid('assessment_id').references('id').inTable('risk_assessments').onDelete('SET NULL');
    t.string('policy_version').notNullable().defaultTo('v1');
    t.string('decision').notNullable();
    t.jsonb('reasons').notNullable().defaultTo('[]');
    t.uuid('override_by');
    t.string('override_reason');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['user_id']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('security_policy_decisions');
  await knex.schema.dropTableIfExists('risk_assessments');
}
