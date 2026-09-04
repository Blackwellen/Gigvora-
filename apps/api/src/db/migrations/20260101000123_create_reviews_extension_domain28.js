// Domain 28 (Trust, Reviews, Reputation, Verification & Safety) — extends the
// existing `reviews` table (created in 20260101000062_create_professional_profile_domain.js,
// which already carries verified-interaction provenance via context_type/context_id and
// server-validated is_verified) rather than duplicating it. Adds: immutable edit history,
// anti-abuse helpful voting, and a generic reputation rollup table that other subject types
// (businesses, companies, gigs) can also write into — reviews stay individually authoritative;
// rollups are a cache, never the source of truth (see §125/§77 of the Domain 28 spec).
export async function up(knex) {
  await knex.schema.alterTable('reviews', (t) => {
    t.integer('version').notNullable().defaultTo(1);
    t.timestamp('edited_at').nullable();
    t.uuid('edited_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.integer('helpful_count').notNullable().defaultTo(0);
    t.integer('not_helpful_count').notNullable().defaultTo(0);
    t.timestamp('removed_at').nullable();
    t.uuid('removed_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.string('removal_reason_code').nullable();
  });

  // One immutable snapshot per prior version, written before every edit so moderation/audit
  // can always reconstruct exactly what was published at any point in time (§15).
  await knex.schema.createTable('review_versions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('review_id').notNullable().references('id').inTable('reviews').onDelete('CASCADE');
    t.integer('version').notNullable();
    t.decimal('overall_rating', 2, 1).notNullable();
    t.text('review_text').nullable();
    t.uuid('edited_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('reason_code').nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.unique(['review_id', 'version']);
  });

  // §17 — one vote per user per review, so helpful/not-helpful can't be farmed.
  await knex.schema.createTable('review_helpful_votes', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('review_id').notNullable().references('id').inTable('reviews').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.boolean('is_helpful').notNullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.unique(['review_id', 'user_id']);
  });

  // §125/§77 — precomputed rollup, keyed generically so professional profiles, businesses,
  // companies and gigs can all share one reputation-summary read path. Never authoritative;
  // always recomputed async from the underlying reviews/recommendations/endorsements rows.
  await knex.schema.createTable('reputation_rollups', (t) => {
    t.string('subject_type').notNullable();
    t.uuid('subject_id').notNullable();
    t.integer('review_count').notNullable().defaultTo(0);
    t.integer('verified_review_count').notNullable().defaultTo(0);
    t.decimal('rating_average', 3, 2).nullable();
    t.jsonb('rating_distribution').notNullable().defaultTo('{"1":0,"2":0,"3":0,"4":0,"5":0}');
    t.integer('recommendation_count').notNullable().defaultTo(0);
    t.integer('endorsement_count').notNullable().defaultTo(0);
    t.integer('completed_transaction_count').notNullable().defaultTo(0);
    t.decimal('repeat_customer_rate', 5, 2).nullable();
    t.decimal('dispute_rate', 5, 2).nullable();
    t.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    t.primary(['subject_type', 'subject_id']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('reputation_rollups');
  await knex.schema.dropTableIfExists('review_helpful_votes');
  await knex.schema.dropTableIfExists('review_versions');
  await knex.schema.alterTable('reviews', (t) => {
    t.dropColumn('version');
    t.dropColumn('edited_at');
    t.dropColumn('edited_by');
    t.dropColumn('helpful_count');
    t.dropColumn('not_helpful_count');
    t.dropColumn('removed_at');
    t.dropColumn('removed_by');
    t.dropColumn('removal_reason_code');
  });
}
