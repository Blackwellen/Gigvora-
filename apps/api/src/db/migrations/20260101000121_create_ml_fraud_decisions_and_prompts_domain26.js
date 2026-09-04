// Domain 26 — fraud/risk decisions (policy outcome, not a raw ban) and the LLM prompt registry
// used by any LLM-assisted parsing/extraction fallback (CV parsing, job parsing). Distinct from
// `ai_prompts` (20260101000063, Domain 25 Copilot chat prompt library) which is a user-facing
// chat-prompt library, not a versioned production model-serving prompt contract — different
// purpose, different lifecycle (approval-gated here), kept separate deliberately.
export async function up(knex) {
  await knex.schema.createTable('ml_fraud_decisions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('subject_type').notNullable(); // account | job | gig | message | review | payment
    t.uuid('subject_id').notNullable();
    t.uuid('model_registry_id').nullable().references('id').inTable('model_registry').onDelete('SET NULL');
    t.decimal('risk_score', 5, 4).notNullable();
    t.enu('risk_band', ['low', 'observe', 'medium', 'high', 'critical']).notNullable();
    t.jsonb('reason_codes').notNullable().defaultTo('[]'); // safe abstracted codes only, e.g. 'unusual_velocity'
    t.enu('decision', ['allow', 'step_up_verification', 'rate_limit', 'manual_review', 'temporary_restriction', 'deny'])
      .notNullable();
    t.enu('decided_by', ['model', 'human_override']).notNullable().defaultTo('model');
    t.uuid('reviewer_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.string('feedback_outcome').nullable(); // true_positive | false_positive | confirmed_abuse | legitimate_user | uncertain
    t.timestamps(true, true);
    t.index(['subject_type', 'subject_id']);
    t.index(['risk_band', 'created_at']);
  });

  await knex.schema.createTable('ml_prompt_templates', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('capability').notNullable(); // cv_parsing | job_parsing | skill_extraction_fallback | explanation_prose
    t.string('name').notNullable();
    t.string('version').notNullable();
    t.text('system_template').notNullable();
    t.string('input_schema_version').notNullable().defaultTo('v1');
    t.string('output_schema_version').notNullable().defaultTo('v1');
    t.string('model').nullable();
    t.jsonb('settings').notNullable().defaultTo('{}');
    t.enu('status', ['draft', 'active', 'deprecated']).notNullable().defaultTo('draft');
    t.uuid('created_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.uuid('approved_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);
    t.unique(['capability', 'name', 'version']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('ml_prompt_templates');
  await knex.schema.dropTableIfExists('ml_fraud_decisions');
}
