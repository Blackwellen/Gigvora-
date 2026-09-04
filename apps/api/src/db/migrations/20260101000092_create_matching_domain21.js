/**
 * Domain 21: Recruiter Pro — AI candidate match scoring, with a human
 * review/override loop.
 */
export async function up(knex) {
  await knex.schema.createTable('candidate_match_scores', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('job_id').nullable().references('id').inTable('jobs').onDelete('CASCADE');
    t.uuid('project_id').nullable().references('id').inTable('recruiter_projects').onDelete('CASCADE');
    t.uuid('candidate_user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.string('candidate_name').notNullable();
    t.string('candidate_email').nullable();
    t.decimal('overall_score', 5, 2).notNullable();
    t.decimal('skills_score', 5, 2).notNullable();
    t.decimal('experience_score', 5, 2).notNullable();
    t.decimal('culture_score', 5, 2).nullable();
    t.text('explanation').nullable();
    t.enu('confidence', ['low', 'medium', 'high']).notNullable().defaultTo('medium');
    t.boolean('human_reviewed').notNullable().defaultTo(false);
    t.enu('human_override', ['approved', 'rejected', 'pending']).notNullable().defaultTo('pending');
    t.uuid('reviewed_by_user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('reviewed_at').nullable();
    t.timestamps(true, true);
    t.index(['job_id'], 'candidate_match_scores_job_idx');
    t.index(['project_id'], 'candidate_match_scores_project_idx');
    t.index(['overall_score'], 'candidate_match_scores_score_idx');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('candidate_match_scores');
}
