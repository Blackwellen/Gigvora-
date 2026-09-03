export async function up(knex) {
  await knex.schema.createTable('account_intent_drafts', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.enu('intent_type', ['client', 'freelancer', 'agency', 'recruiter', 'business']).notNullable();
    t.jsonb('draft').notNullable().defaultTo('{}');
    t.integer('step').notNullable().defaultTo(1);
    t.enu('status', ['in_progress', 'completed']).notNullable().defaultTo('in_progress');
    t.timestamps(true, true);
    t.timestamp('completed_at');
    t.unique(['user_id']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('account_intent_drafts');
}
