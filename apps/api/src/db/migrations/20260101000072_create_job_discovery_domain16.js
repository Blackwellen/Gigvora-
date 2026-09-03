// Domain 16 — job discovery/engagement tables layered on top of the existing
// `jobs` table. `job_skills` is a supplementary structured table alongside
// `jobs.skills` jsonb (service layer keeps both in sync on write so existing
// public job cards reading the jsonb column keep working unchanged).
export async function up(knex) {
  await knex.schema.createTable('job_skills', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('job_id').notNullable().references('id').inTable('jobs').onDelete('CASCADE');
    t.string('skill_name').notNullable();
    t.boolean('is_required').notNullable().defaultTo(true);
    t.integer('weight').notNullable().defaultTo(1);
    t.timestamps(true, true);
    t.unique(['job_id', 'skill_name']);
    t.index(['job_id'], 'job_skills_job_id_idx');
  });

  await knex.schema.createTable('job_screening_questions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('job_id').notNullable().references('id').inTable('jobs').onDelete('CASCADE');
    t.text('question_text').notNullable();
    t.enu('question_type', ['text', 'yes_no', 'multiple_choice', 'numeric']).notNullable().defaultTo('text');
    t.boolean('is_knockout').notNullable().defaultTo(false);
    t.jsonb('options').notNullable().defaultTo('[]');
    t.integer('order_index').notNullable().defaultTo(0);
    t.timestamps(true, true);
    t.index(['job_id'], 'job_screening_questions_job_id_idx');
  });

  await knex.schema.createTable('job_views', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('job_id').notNullable().references('id').inTable('jobs').onDelete('CASCADE');
    t.uuid('viewer_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('viewed_at').notNullable().defaultTo(knex.fn.now());
    t.string('source').nullable();
    t.index(['job_id', 'viewed_at'], 'job_views_job_viewed_idx');
  });

  await knex.schema.createTable('job_saves', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('job_id').notNullable().references('id').inTable('jobs').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.timestamps(true, true);
    t.unique(['job_id', 'user_id']);
    t.index(['user_id'], 'job_saves_user_id_idx');
  });

  await knex.schema.createTable('job_alerts', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('keywords').nullable();
    t.string('location').nullable();
    t.boolean('remote').notNullable().defaultTo(false);
    t.string('employment_type').nullable();
    t.string('category').nullable();
    t.integer('salary_min').nullable();
    t.enu('frequency', ['instant', 'daily', 'weekly']).notNullable().defaultTo('daily');
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamp('last_run_at').nullable();
    t.timestamps(true, true);
    t.index(['user_id', 'is_active'], 'job_alerts_user_active_idx');
  });

  await knex.schema.createTable('job_alert_runs', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('job_alert_id').notNullable().references('id').inTable('job_alerts').onDelete('CASCADE');
    t.timestamp('run_at').notNullable().defaultTo(knex.fn.now());
    t.integer('matched_count').notNullable().defaultTo(0);
    t.index(['job_alert_id', 'run_at'], 'job_alert_runs_alert_run_idx');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('job_alert_runs');
  await knex.schema.dropTableIfExists('job_alerts');
  await knex.schema.dropTableIfExists('job_saves');
  await knex.schema.dropTableIfExists('job_views');
  await knex.schema.dropTableIfExists('job_screening_questions');
  await knex.schema.dropTableIfExists('job_skills');
}
