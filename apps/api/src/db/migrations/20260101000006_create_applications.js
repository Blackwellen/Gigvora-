export async function up(knex) {
  await knex.schema.createTable('applications', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('job_id').notNullable().references('id').inTable('jobs').onDelete('CASCADE');
    t.uuid('applicant_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('resume_url');
    t.text('cover_letter');
    t.enu('status', ['submitted', 'reviewing', 'shortlisted', 'interviewing', 'offered', 'rejected', 'withdrawn'])
      .notNullable()
      .defaultTo('submitted');
    t.decimal('match_score', 5, 2);
    t.jsonb('ml_insights').notNullable().defaultTo('{}');
    t.timestamps(true, true);
    t.unique(['job_id', 'applicant_id']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('applications');
}
