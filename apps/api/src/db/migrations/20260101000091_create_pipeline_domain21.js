/**
 * Domain 21: Recruiter Pro — hiring pipeline (Kanban-style stages +
 * candidates moving through them). A pipeline can be scoped to a
 * `recruiter_projects` row, a `jobs` row, or both.
 *
 * `recruiter_projects` is created by Domain 20's migration
 * (20260101000090_create_recruiter_standard_domain20.js), which runs first
 * in this build; this migration only needs its `id` column to exist for
 * the FK below (Domain 20's shape: id, recruiter_id -> users, name,
 * description, client_or_role, status enum('active','on_hold','completed',
 * 'archived'), target_hires, filled_hires, target_date, timestamps — no
 * company_id/workspace scoping).
 */
export async function up(knex) {
  await knex.schema.createTable('pipeline_stages', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('project_id').nullable().references('id').inTable('recruiter_projects').onDelete('CASCADE');
    t.uuid('job_id').nullable().references('id').inTable('jobs').onDelete('CASCADE');
    t.string('name').notNullable();
    t.integer('sort_order').notNullable().defaultTo(0);
    t.enu('stage_type', ['sourced', 'screening', 'interview', 'offer', 'hired', 'rejected']).notNullable().defaultTo('sourced');
    t.string('color', 16).notNullable().defaultTo('blue');
    t.boolean('is_default').notNullable().defaultTo(false);
    t.timestamps(true, true);
    t.index(['project_id'], 'pipeline_stages_project_idx');
    t.index(['job_id'], 'pipeline_stages_job_idx');
  });

  await knex.schema.createTable('pipeline_candidates', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('stage_id').notNullable().references('id').inTable('pipeline_stages').onDelete('CASCADE');
    t.uuid('project_id').nullable().references('id').inTable('recruiter_projects').onDelete('CASCADE');
    t.uuid('job_id').nullable().references('id').inTable('jobs').onDelete('CASCADE');
    t.uuid('candidate_user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.string('candidate_name').notNullable();
    t.string('candidate_email').nullable();
    t.string('candidate_headline').nullable();
    t.string('source').nullable();
    t.decimal('match_score', 5, 2).nullable();
    t.integer('sort_order').notNullable().defaultTo(0);
    t.timestamp('moved_at').notNullable().defaultTo(knex.fn.now());
    t.uuid('added_by_user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.text('notes').nullable();
    t.timestamps(true, true);
    t.index(['stage_id'], 'pipeline_candidates_stage_idx');
    t.index(['project_id'], 'pipeline_candidates_project_idx');
    t.index(['job_id'], 'pipeline_candidates_job_idx');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('pipeline_candidates');
  await knex.schema.dropTableIfExists('pipeline_stages');
}
