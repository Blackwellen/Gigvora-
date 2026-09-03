// Domain 05 Phase 4 — minimal moderation governance audit trail. Additive:
// posts.status already accepts arbitrary strings (see
// 20260101000053_add_post_draft_scheduling_topics.js, plain `string` column,
// no CHECK constraint), so 'under_review' needs no schema change there — this
// migration only adds the audit-trail table that records who took what
// action on which held/removed object, and why.
export async function up(knex) {
  await knex.schema.createTable('content_moderation_actions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('object_type').notNullable(); // 'post' | 'article' | 'comment'
    t.uuid('object_id').notNullable();
    t.string('action').notNullable(); // held | approved | removed | restricted
    t.text('reason').nullable();
    t.string('actor_type').notNullable(); // system | admin
    t.uuid('actor_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['object_type', 'object_id']);
    t.index(['action']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('content_moderation_actions');
}
