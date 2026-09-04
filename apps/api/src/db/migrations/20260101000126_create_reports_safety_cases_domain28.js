// Domain 28 — Reporting + Safety Case management. Reports are the user-facing entry point
// (§44-50); safety_cases are the internal investigation unit multiple reports can link into
// (§51/§166), distinct from the existing generic `disputes` table (buyer/seller commercial
// conflict, see 20260101000070_create_disputes_domain.js) and from `content_moderation_actions`
// (lightweight post/comment hold-review queue, see modules/moderation) — a safety case is a
// heavier, policy-driven trust & safety investigation that can span content, accounts, fraud
// and marketplace behaviour at once, with its own SLA/decision/enforcement machinery.
// Reporter identity is never exposed to the reported subject via any read path (§48) — enforced
// in the service layer, not the schema, but note `reporter_id` here is intentionally not joined
// into any subject-facing response.
export async function up(knex) {
  await knex.schema.createTable('report_reasons', (t) => {
    t.string('code').primary();
    t.string('parent_code').nullable().references('code').inTable('report_reasons').onDelete('SET NULL');
    t.string('label').notNullable();
    t.text('description').nullable();
    t.integer('sort_order').notNullable().defaultTo(0);
    t.boolean('active').notNullable().defaultTo(true);
  });

  // §45 — top-level reason taxonomy, seeded as reference data (not a demo fixture) so it
  // exists in every environment the moment this migration runs.
  const topLevelReasons = [
    'spam', 'scam_fraud', 'impersonation', 'harassment_bullying', 'threat',
    'hate_abusive_conduct', 'sexual_content_exploitation', 'illegal_goods_services',
    'misleading_job', 'misleading_business', 'marketplace_issue', 'review_manipulation',
    'intellectual_property', 'privacy_personal_information', 'safety_concern', 'other',
  ];
  await knex('report_reasons').insert(
    topLevelReasons.map((code, i) => ({
      code,
      parent_code: null,
      label: code.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      sort_order: i,
    }))
  );

  await knex.schema.createTable('safety_cases', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('case_number').notNullable().unique(); // e.g. CASE-2026-001948
    t.string('case_type').notNullable(); // content | account | marketplace | fraud | verification | appeal_related
    t.string('policy_category').nullable();
    t.enu('severity', ['low', 'medium', 'high', 'critical']).notNullable().defaultTo('medium');
    t.enu('status', [
      'new', 'triaged', 'in_review', 'awaiting_information', 'escalated', 'action_pending',
      'resolved_no_action', 'resolved_actioned', 'appealed', 'reopened', 'closed',
    ]).notNullable().defaultTo('new');
    t.string('subject_type').notNullable();
    t.uuid('subject_id').notNullable();
    t.uuid('assignee_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.string('team').nullable();
    t.timestamp('target_first_review_at').nullable();
    t.timestamp('target_resolution_at').nullable();
    t.uuid('primary_case_id').nullable().references('id').inTable('safety_cases').onDelete('SET NULL'); // merge target
    t.decimal('risk_score', 4, 3).nullable();
    t.timestamp('resolved_at').nullable();
    t.timestamp('closed_at').nullable();
    t.timestamps(true, true);
    t.index(['status', 'severity']);
    t.index(['assignee_id', 'status']);
    t.index(['subject_type', 'subject_id']);
  });

  await knex.schema.createTable('reports', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('report_number').notNullable().unique(); // e.g. RPT-2026-004218
    t.uuid('reporter_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('object_type').notNullable();
    t.uuid('object_id').notNullable();
    t.string('reason_code').notNullable().references('code').inTable('report_reasons');
    t.string('subreason_code').nullable().references('code').inTable('report_reasons');
    t.text('description').nullable();
    t.jsonb('evidence_reference').notNullable().defaultTo('[]');
    t.enu('urgency', ['normal', 'urgent', 'emergency']).notNullable().defaultTo('normal');
    t.enu('status', ['submitted', 'triaged', 'linked', 'closed']).notNullable().defaultTo('submitted');
    t.uuid('case_id').nullable().references('id').inTable('safety_cases').onDelete('SET NULL');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['object_type', 'object_id']);
    t.index(['reporter_id', 'created_at']);
    t.index(['case_id']);
  });

  await knex.schema.createTable('case_status_history', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('case_id').notNullable().references('id').inTable('safety_cases').onDelete('CASCADE');
    t.string('from_status').nullable();
    t.string('to_status').notNullable();
    t.uuid('actor_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.text('reason').nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['case_id', 'created_at']);
  });

  await knex.schema.createTable('case_notes', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('case_id').notNullable().references('id').inTable('safety_cases').onDelete('CASCADE');
    t.uuid('author_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.text('body').notNullable();
    t.string('visibility').notNullable().defaultTo('internal'); // internal notes are never customer-facing
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['case_id', 'created_at']);
  });

  // §58 — a structured decision, never a bare free-text verdict.
  await knex.schema.createTable('case_decisions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('case_id').notNullable().references('id').inTable('safety_cases').onDelete('CASCADE');
    t.string('policy').nullable();
    t.string('rule').nullable();
    t.text('finding').notNullable();
    t.decimal('confidence', 4, 3).nullable();
    t.string('action_type').notNullable(); // see enforcement_actions.action_type enum values
    t.string('duration').nullable(); // e.g. '7d', 'permanent'
    t.string('scope').nullable(); // e.g. 'messaging', 'account', 'listing:<id>'
    t.uuid('reviewer_id').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.uuid('approver_id').nullable().references('id').inTable('users').onDelete('SET NULL'); // dual-control (§66)
    t.string('reason_code').nullable();
    t.text('user_explanation').nullable();
    t.boolean('appeal_eligible').notNullable().defaultTo(true);
    t.enu('status', ['pending_approval', 'approved', 'rejected', 'executed']).notNullable().defaultTo('pending_approval');
    t.timestamps(true, true);
    t.index(['case_id']);
  });

  // §59/§60 — enforcement actions are scoped, never a blanket account-wide default.
  await knex.schema.createTable('enforcement_actions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('decision_id').notNullable().references('id').inTable('case_decisions').onDelete('CASCADE');
    t.string('subject_type').notNullable();
    t.uuid('subject_id').notNullable();
    t.string('action_type').notNullable();
    t.string('scope').notNullable().defaultTo('account');
    t.timestamp('starts_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('ends_at').nullable();
    t.enu('status', ['pending', 'active', 'expired', 'reversed']).notNullable().defaultTo('pending');
    t.timestamp('executed_at').nullable();
    t.timestamp('reversed_at').nullable();
    t.text('reversal_reason').nullable();
    t.string('system_reference').nullable();
    t.timestamps(true, true);
    t.index(['subject_type', 'subject_id', 'status']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('enforcement_actions');
  await knex.schema.dropTableIfExists('case_decisions');
  await knex.schema.dropTableIfExists('case_notes');
  await knex.schema.dropTableIfExists('case_status_history');
  await knex.schema.dropTableIfExists('reports');
  await knex.schema.dropTableIfExists('safety_cases');
  await knex.schema.dropTableIfExists('report_reasons');
}
