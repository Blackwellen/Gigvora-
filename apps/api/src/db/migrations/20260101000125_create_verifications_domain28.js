// Domain 28 — Verification Centre. One polymorphic `verifications` table covers all five
// verification types (identity/professional/business/qualification/employment) plus
// email/phone/domain, rather than five near-identical tables, because they all share the same
// provenance/state-machine shape (§30/§29); type-specific claim data lives in `claim_data`
// jsonb rather than sparse per-type columns. Provider callbacks are recorded in
// `verification_events` keyed by provider_event_id for idempotent webhook handling (§199).
// No raw identity documents, biometric templates or document images are stored here — only
// provider result metadata (§31/§143). Domain verification (DNS TXT) is real and needs no
// external provider, so it gets its own lightweight table.
export async function up(knex) {
  await knex.schema.createTable('verifications', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('subject_type').notNullable(); // 'user' | 'profile' | 'company'
    t.uuid('subject_id').notNullable();
    t.enu('verification_type', ['identity', 'professional', 'business', 'qualification', 'employment', 'email', 'phone'])
      .notNullable();
    t.enu('status', [
      'not_started', 'draft', 'submitted', 'processing', 'action_required',
      'needs_review', 'verified', 'partially_verified', 'rejected', 'expired', 'revoked', 'cancelled',
    ]).notNullable().defaultTo('draft');
    t.string('method').nullable(); // provider_hosted | institution_api | manual_review | work_email | dns_txt ...
    t.string('provider').nullable();
    t.string('provider_reference').nullable();
    t.jsonb('claim_data').notNullable().defaultTo('{}'); // type-specific claim fields, no raw docs
    t.jsonb('evidence_reference').notNullable().defaultTo('[]'); // storage object keys only
    t.decimal('confidence', 4, 3).nullable();
    t.string('reason_code').nullable();
    t.uuid('reviewer_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.integer('version').notNullable().defaultTo(1);
    t.timestamp('submitted_at').nullable();
    t.timestamp('verified_at').nullable();
    t.timestamp('expires_at').nullable();
    t.timestamp('revoked_at').nullable();
    t.string('revocation_reason').nullable();
    t.timestamps(true, true);
    t.index(['subject_type', 'subject_id', 'verification_type'], 'verifications_subject_type_idx');
    t.index(['status'], 'verifications_status_idx');
    t.index(['expires_at'], 'verifications_expires_idx');
  });

  await knex.schema.createTable('verification_events', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('verification_id').notNullable().references('id').inTable('verifications').onDelete('CASCADE');
    t.string('event_type').notNullable();
    t.string('provider').nullable();
    t.string('provider_event_id').nullable();
    t.jsonb('payload').notNullable().defaultTo('{}');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    // Idempotent webhook dedup (§199) — a provider_event_id, when present, may only land once.
    t.unique(['provider', 'provider_event_id']);
  });

  await knex.schema.createTable('domain_verifications', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('subject_type').notNullable();
    t.uuid('subject_id').notNullable();
    t.string('domain').notNullable();
    t.enu('method', ['dns_txt', 'html_file']).notNullable().defaultTo('dns_txt');
    t.string('token_hash').notNullable();
    t.enu('status', ['pending_dns', 'verified', 'failed', 'expired']).notNullable().defaultTo('pending_dns');
    t.timestamp('requested_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('verified_at').nullable();
    t.timestamp('last_checked_at').nullable();
    t.index(['subject_type', 'subject_id']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('domain_verifications');
  await knex.schema.dropTableIfExists('verification_events');
  await knex.schema.dropTableIfExists('verifications');
}
