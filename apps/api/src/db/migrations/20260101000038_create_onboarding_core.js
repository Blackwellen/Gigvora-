// Domain 04 §41-43: onboarding sessions/steps/responses. Full step catalogs
// for the 9 role wizards (04.01-04.09) are seeded in the next phase; this
// migration only creates the shared shape used by every track.
export async function up(knex) {
  await knex.schema.createTable('onboarding_sessions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('company_id').nullable().references('id').inTable('companies').onDelete('CASCADE');
    t.string('track').notNullable(); // e.g. 'cv-import', 'profile-import', 'company-import', 'contacts-import'
    t.enu('status', ['in_progress', 'completed', 'abandoned']).notNullable().defaultTo('in_progress');
    t.string('current_step_key').nullable();
    t.jsonb('context').notNullable().defaultTo('{}');
    t.timestamp('started_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('completed_at').nullable();
    t.timestamp('last_active_at').notNullable().defaultTo(knex.fn.now());
    t.timestamps(true, true);
  });
  await knex.schema.alterTable('onboarding_sessions', (t) => {
    t.index(['user_id', 'track']);
    t.index(['status']);
  });

  await knex.schema.createTable('onboarding_steps', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('track').notNullable();
    t.string('step_key').notNullable();
    t.integer('step_order').notNullable().defaultTo(0);
    t.string('title').notNullable();
    t.text('description').nullable();
    t.jsonb('schema_json').notNullable().defaultTo('{}'); // server-validated shape for this step's response
    t.boolean('is_required').notNullable().defaultTo(true);
    t.timestamps(true, true);
    t.unique(['track', 'step_key']);
  });
  await knex.schema.alterTable('onboarding_steps', (t) => {
    t.index(['track', 'step_order']);
  });

  await knex.schema.createTable('onboarding_step_responses', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('session_id').notNullable().references('id').inTable('onboarding_sessions').onDelete('CASCADE');
    t.string('step_key').notNullable();
    t.jsonb('response_json').notNullable().defaultTo('{}');
    t.timestamp('completed_at').nullable();
    t.timestamps(true, true);
    t.unique(['session_id', 'step_key']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('onboarding_step_responses');
  await knex.schema.dropTableIfExists('onboarding_steps');
  await knex.schema.dropTableIfExists('onboarding_sessions');
}
