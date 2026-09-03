// `interviewer_ids` is a jsonb array of user ids on the interview itself
// (not a separate junction table — not in the spec's table list, and a
// scorecard per interviewer already gives us a per-interviewer row to key
// off for feedback/recommendation).
export async function up(knex) {
  await knex.schema.createTable('interviews', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('application_id').notNullable().references('id').inTable('applications').onDelete('CASCADE');
    t.uuid('job_id').notNullable().references('id').inTable('jobs').onDelete('CASCADE');
    t.enu('type', ['phone_screen', 'technical', 'onsite', 'panel', 'final']).notNullable().defaultTo('phone_screen');
    t.timestamp('scheduled_at').notNullable();
    t.integer('duration_minutes').notNullable().defaultTo(30);
    t.string('location_or_link').nullable();
    t.enu('status', ['scheduled', 'completed', 'cancelled', 'no_show']).notNullable().defaultTo('scheduled');
    t.integer('round_number').notNullable().defaultTo(1);
    t.jsonb('interviewer_ids').notNullable().defaultTo('[]');
    t.timestamps(true, true);
    t.index(['application_id'], 'interviews_application_id_idx');
    t.index(['job_id'], 'interviews_job_id_idx');
    t.index(['status'], 'interviews_status_idx');
    t.index(['scheduled_at'], 'interviews_scheduled_at_idx');
  });

  await knex.schema.createTable('interview_scorecards', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('interview_id').notNullable().references('id').inTable('interviews').onDelete('CASCADE');
    t.uuid('interviewer_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.decimal('overall_rating', 3, 1).nullable();
    t.enu('recommendation', ['strong_yes', 'yes', 'neutral', 'no', 'strong_no']).nullable();
    t.timestamp('submitted_at').nullable();
    t.timestamps(true, true);
    t.unique(['interview_id', 'interviewer_id']);
    t.index(['interview_id'], 'interview_scorecards_interview_id_idx');
  });

  await knex.schema.createTable('interview_feedback', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('scorecard_id').notNullable().references('id').inTable('interview_scorecards').onDelete('CASCADE');
    t.string('criterion').notNullable();
    t.integer('rating').nullable();
    t.text('comments').nullable();
    t.timestamps(true, true);
    t.index(['scorecard_id'], 'interview_feedback_scorecard_id_idx');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('interview_feedback');
  await knex.schema.dropTableIfExists('interview_scorecards');
  await knex.schema.dropTableIfExists('interviews');
}
