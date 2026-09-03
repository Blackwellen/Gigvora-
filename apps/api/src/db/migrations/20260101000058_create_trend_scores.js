// Domain 05 Phase 3 — real, velocity-based trending. One row per
// (object_type, object_id, window), recomputed on a schedule (originally a
// setInterval in server.js; Phase 5 replaced that with a BullMQ repeatable
// job — see jobs/workers/trendRecompute.worker.js).
export async function up(knex) {
  await knex.schema.createTable('trend_scores', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.enu('object_type', ['post', 'article', 'poll', 'hashtag']).notNullable();
    t.uuid('object_id').notNullable();
    t.enu('window', ['24h', '7d', '30d']).notNullable();
    t.decimal('score', 14, 4).notNullable();
    t.integer('rank').notNullable();
    t.timestamp('calculated_at').notNullable().defaultTo(knex.fn.now());
  });
  await knex.schema.alterTable('trend_scores', (t) => {
    // One current row per (object_type, object_id, window) — recompute
    // upserts rather than growing an unbounded history table.
    t.unique(['object_type', 'object_id', 'window']);
    t.index(['object_type', 'window', 'rank']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('trend_scores');
}
