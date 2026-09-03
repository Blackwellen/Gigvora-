// Domain 05 Phase 3 — Post Analytics. One row per (post_id, date), upserted
// by the impression-recording endpoint (POST /feed/posts/:id/impressions)
// and read back for the KPI strip / time-series / prior-period comparison
// on the Post Analytics page. reactions/comments/shares/saves here are daily
// deltas recorded at impression-record time is NOT how this works — those
// four columns are recomputed as day-bucketed real counts directly from
// post_reactions/post_comments/post_shares/saved_items (see
// analytics.service.js#syncEngagementForDate), impressions/unique_reach/
// clicks are the only columns the impression endpoint itself writes to.
export async function up(knex) {
  await knex.schema.createTable('post_metrics_daily', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('post_id').notNullable().references('id').inTable('posts').onDelete('CASCADE');
    t.date('date').notNullable();
    t.integer('impressions').notNullable().defaultTo(0);
    t.integer('unique_reach').notNullable().defaultTo(0);
    t.integer('reactions').notNullable().defaultTo(0);
    t.integer('comments').notNullable().defaultTo(0);
    t.integer('shares').notNullable().defaultTo(0);
    t.integer('saves').notNullable().defaultTo(0);
    t.integer('clicks').notNullable().defaultTo(0);
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.unique(['post_id', 'date']);
  });
  await knex.schema.alterTable('post_metrics_daily', (t) => {
    t.index(['post_id', 'date']);
  });

  // Dedup table backing post_metrics_daily.unique_reach: one row per
  // (post_id, date, viewer). The impression endpoint always increments
  // `impressions`; it increments `unique_reach` only when inserting a row
  // here actually happens (ON CONFLICT DO NOTHING reports 0 rows for a
  // repeat viewer that day) — so unique_reach is a real distinct-viewer
  // count, not an estimate.
  await knex.schema.createTable('post_impression_viewers', (t) => {
    t.uuid('post_id').notNullable().references('id').inTable('posts').onDelete('CASCADE');
    t.date('date').notNullable();
    t.uuid('viewer_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.primary(['post_id', 'date', 'viewer_id']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('post_impression_viewers');
  await knex.schema.dropTableIfExists('post_metrics_daily');
}
