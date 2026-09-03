// Domain 05 Phase 5 gap-close: bring comments to parity with posts/articles
// moderation (hold_for_review -> queued -> admin approve/remove), instead of
// rejecting held comments outright. Additive, same pattern as
// 20260101000053_add_post_draft_scheduling_topics.js (plain string column,
// no CHECK constraint, so 'under_review' / 'removed' need no enum change).
export async function up(knex) {
  await knex.schema.alterTable('post_comments', (t) => {
    t.string('status').notNullable().defaultTo('published'); // published | under_review | removed
  });
  await knex.schema.alterTable('post_comments', (t) => {
    t.index(['status']);
  });
}

export async function down(knex) {
  await knex.schema.alterTable('post_comments', (t) => {
    t.dropColumn('status');
  });
}
