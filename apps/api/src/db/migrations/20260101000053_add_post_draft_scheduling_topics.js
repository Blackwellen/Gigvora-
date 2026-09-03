export async function up(knex) {
  await knex.schema.alterTable('posts', (t) => {
    // 'draft' posts are never returned by any feed/candidate query except to
    // their own author (see posts.service.js visibleCandidates/getPostById) —
    // this is what backs Create Post's autosave-before-publish flow.
    t.string('status').notNullable().defaultTo('published'); // draft | published
    t.timestamp('scheduled_at').nullable();
    t.jsonb('topics').notNullable().defaultTo('[]'); // plain hashtag/topic strings — no topic module exists yet (Phase 3 dependency)
  });
  await knex.schema.alterTable('posts', (t) => {
    t.index(['status']);
    t.index(['scheduled_at']);
  });
}

export async function down(knex) {
  await knex.schema.alterTable('posts', (t) => {
    t.dropColumn('status');
    t.dropColumn('scheduled_at');
    t.dropColumn('topics');
  });
}
