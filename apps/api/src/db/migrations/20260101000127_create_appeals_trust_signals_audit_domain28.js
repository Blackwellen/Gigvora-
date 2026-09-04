// Domain 28 — Appeals, public/internal trust signals, and the immutable Trust & Safety audit
// log (kept separate from case_status_history, which is user-visible case timeline, and from
// verification_events, which is provider webhook history — §193 requires these stay distinct).
export async function up(knex) {
  await knex.schema.createTable('appeals', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('appeal_number').notNullable().unique(); // e.g. APL-2026-000382
    t.uuid('case_id').nullable().references('id').inTable('safety_cases').onDelete('SET NULL');
    t.uuid('decision_id').nullable().references('id').inTable('case_decisions').onDelete('SET NULL');
    t.uuid('appellant_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.text('reason').notNullable();
    t.jsonb('evidence_reference').notNullable().defaultTo('[]');
    t.enu('status', [
      'submitted', 'screening', 'in_review', 'awaiting_information',
      'upheld', 'partially_upheld', 'denied', 'withdrawn', 'closed',
    ]).notNullable().defaultTo('submitted');
    t.timestamp('submitted_at').notNullable().defaultTo(knex.fn.now());
    t.uuid('assigned_reviewer_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('review_started_at').nullable();
    t.timestamp('decided_at').nullable();
    t.string('outcome').nullable();
    t.text('outcome_reason').nullable();
    t.timestamps(true, true);
    t.index(['appellant_id', 'status']);
    t.index(['status']);
  });

  // §126 — the single place public trust badges and internal overviews both read from.
  await knex.schema.createTable('trust_signals', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('subject_type').notNullable();
    t.uuid('subject_id').notNullable();
    t.string('signal_key').notNullable(); // e.g. 'identity_verified', 'marketplace_completed_orders'
    t.string('signal_type').notNullable(); // 'boolean' | 'count' | 'rate' | 'enum'
    t.string('status').notNullable().defaultTo('active');
    t.jsonb('value').notNullable().defaultTo('null');
    t.string('source_type').notNullable(); // 'verification' | 'rollup' | 'manual' | 'ml'
    t.uuid('source_id').nullable();
    t.decimal('confidence', 4, 3).nullable();
    t.boolean('public_visibility').notNullable().defaultTo(true);
    t.timestamp('valid_from').notNullable().defaultTo(knex.fn.now());
    t.timestamp('valid_until').nullable();
    t.timestamp('computed_at').notNullable().defaultTo(knex.fn.now());
    t.unique(['subject_type', 'subject_id', 'signal_key']);
    t.index(['subject_type', 'subject_id']);
    t.index(['valid_until']);
  });

  await knex.schema.createTable('trust_audit_log', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('actor_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.string('action').notNullable();
    t.string('object_type').notNullable();
    t.uuid('object_id').notNullable();
    t.jsonb('before').nullable();
    t.jsonb('after').nullable();
    t.text('reason').nullable();
    t.string('request_id').nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['object_type', 'object_id']);
    t.index(['actor_id', 'created_at']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('trust_audit_log');
  await knex.schema.dropTableIfExists('trust_signals');
  await knex.schema.dropTableIfExists('appeals');
}
