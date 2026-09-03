export async function up(knex) {
  await knex.schema.createTable('hire_handoffs', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('application_id').notNullable().references('id').inTable('applications').onDelete('CASCADE');
    t.uuid('job_id').notNullable().references('id').inTable('jobs').onDelete('CASCADE');
    t.uuid('candidate_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.enu('status', ['pending', 'in_progress', 'completed']).notNullable().defaultTo('pending');
    t.date('start_date').nullable();
    t.uuid('onboarding_owner_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.jsonb('checklist').notNullable().defaultTo('[]');
    t.text('notes').nullable();
    t.timestamps(true, true);
    t.unique(['application_id']);
    t.index(['job_id'], 'hire_handoffs_job_id_idx');
    t.index(['status'], 'hire_handoffs_status_idx');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('hire_handoffs');
}
