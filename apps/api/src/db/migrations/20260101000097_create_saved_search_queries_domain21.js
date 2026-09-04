/**
 * Domain 21: Recruiter Pro — saved advanced candidate search queries
 * (structured boolean AND/OR/NOT groups persisted per recruiter so they can
 * be re-run later without rebuilding the query).
 */
export async function up(knex) {
  await knex.schema.createTable('recruiter_saved_queries', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('name').notNullable();
    t.jsonb('query_json').notNullable();
    t.timestamps(true, true);
    t.index(['user_id'], 'recruiter_saved_queries_user_idx');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('recruiter_saved_queries');
}
