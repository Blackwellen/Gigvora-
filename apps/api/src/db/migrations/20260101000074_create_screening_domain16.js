export async function up(knex) {
  await knex.schema.createTable('application_answers', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('application_id').notNullable().references('id').inTable('applications').onDelete('CASCADE');
    t.uuid('question_id').nullable().references('id').inTable('job_screening_questions').onDelete('SET NULL');
    t.text('answer_text').nullable();
    t.timestamps(true, true);
    t.index(['application_id'], 'application_answers_application_id_idx');
  });

  await knex.schema.createTable('screening_reviews', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('application_id').notNullable().references('id').inTable('applications').onDelete('CASCADE');
    t.uuid('reviewer_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.enu('decision', ['pass', 'reject', 'advance']).notNullable();
    t.text('notes').nullable();
    t.decimal('auto_score', 5, 2).nullable();
    t.timestamps(true, true);
    t.index(['application_id', 'created_at'], 'screening_reviews_application_created_idx');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('screening_reviews');
  await knex.schema.dropTableIfExists('application_answers');
}
