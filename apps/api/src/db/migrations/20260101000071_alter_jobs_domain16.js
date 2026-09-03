// Domain 16 — additive columns on the existing `jobs` table (created in
// 20260101000005_create_jobs.js; slug already added in
// 20260101000034_add_job_slugs_and_backfill.js so it is NOT re-added here).
// Existing columns (status/work_mode/employment_type/skills) are untouched.
export async function up(knex) {
  await knex.schema.alterTable('jobs', (t) => {
    t.enu('seniority', ['entry', 'mid', 'senior', 'lead', 'principal', 'executive']).nullable();
    t.string('category').nullable();
    t.date('application_deadline').nullable();
    t.integer('headcount').notNullable().defaultTo(1);
    t.timestamp('published_at').nullable();
  });

  await knex.schema.alterTable('jobs', (t) => {
    t.index(['company_id'], 'jobs_company_id_idx');
    t.index(['category'], 'jobs_category_idx');
    t.index(['seniority'], 'jobs_seniority_idx');
    t.index(['created_at'], 'jobs_created_at_idx');
  });

  // Backfill published_at for already-open jobs so analytics/time-to-fill
  // has a real anchor instead of NULL for pre-existing rows.
  await knex('jobs').where({ status: 'open' }).whereNull('published_at').update({ published_at: knex.raw('created_at') });
}

export async function down(knex) {
  await knex.schema.alterTable('jobs', (t) => {
    t.dropColumn('seniority');
    t.dropColumn('category');
    t.dropColumn('application_deadline');
    t.dropColumn('headcount');
    t.dropColumn('published_at');
  });
}
