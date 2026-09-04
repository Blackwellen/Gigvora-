// Domain 26 — registry of semantic/vector indexes (26.05 Embedding / Semantic Search). This
// tracks index *metadata* for the admin operational view; it does not itself store vectors — the
// codebase has no vector store wired up yet (no pgvector extension / embedding column found), so
// the intelligence.service.js search-test endpoint runs lexical-only and reports
// `semantic_available: false` against these rows until a real embedding backend lands. Recording
// that honestly here (rather than pretending indexes are populated) matches the "no fake AI
// dashboards" requirement.
export async function up(knex) {
  await knex.schema.createTable('ml_embedding_indexes', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('name').notNullable().unique(); // e.g. professional-profile-v3
    t.string('entity_type').notNullable();
    t.string('embedding_model').nullable();
    t.integer('dimension').nullable();
    t.string('distance_metric').nullable(); // cosine | dot | euclidean
    t.bigInteger('record_count').notNullable().defaultTo(0);
    t.string('index_version').notNullable().defaultTo('v1');
    t.enu('status', ['healthy', 'degraded', 'unhealthy', 'disabled', 'deploying', 'not_built']).notNullable().defaultTo('not_built');
    t.timestamp('last_indexed_at').nullable();
    t.integer('avg_query_latency_ms').nullable();
    t.timestamps(true, true);
    t.index(['entity_type']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('ml_embedding_indexes');
}
