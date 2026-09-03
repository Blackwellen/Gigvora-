export async function up(knex) {
  await knex.schema.createTable('assessments', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('job_id').notNullable().references('id').inTable('jobs').onDelete('CASCADE');
    t.string('title').notNullable();
    t.text('description').nullable();
    t.string('assessment_type').notNullable().defaultTo('custom');
    t.integer('passing_score').nullable();
    t.integer('time_limit_minutes').nullable();
    t.uuid('created_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.timestamps(true, true);
    t.index(['job_id'], 'assessments_job_id_idx');
  });

  await knex.schema.createTable('assessment_assignments', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('assessment_id').notNullable().references('id').inTable('assessments').onDelete('CASCADE');
    t.uuid('application_id').notNullable().references('id').inTable('applications').onDelete('CASCADE');
    t.enu('status', ['assigned', 'in_progress', 'submitted', 'expired']).notNullable().defaultTo('assigned');
    t.timestamp('assigned_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('due_at').nullable();
    t.timestamps(true, true);
    t.index(['application_id'], 'assessment_assignments_application_id_idx');
    t.index(['assessment_id'], 'assessment_assignments_assessment_id_idx');
    t.index(['status'], 'assessment_assignments_status_idx');
  });

  await knex.schema.createTable('assessment_results', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('assignment_id').notNullable().references('id').inTable('assessment_assignments').onDelete('CASCADE');
    t.decimal('score', 5, 2).nullable();
    t.jsonb('breakdown').notNullable().defaultTo('{}');
    t.boolean('passed').nullable();
    t.timestamp('submitted_at').nullable();
    t.uuid('reviewed_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);
    t.index(['assignment_id'], 'assessment_results_assignment_id_idx');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('assessment_results');
  await knex.schema.dropTableIfExists('assessment_assignments');
  await knex.schema.dropTableIfExists('assessments');
}
