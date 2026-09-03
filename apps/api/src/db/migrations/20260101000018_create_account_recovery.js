export async function up(knex) {
  await knex.schema.createTable('account_recovery_requests', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    t.enu('status', ['started', 'verifying', 'pending_review', 'delayed', 'completed', 'cancelled', 'expired']).notNullable().defaultTo('started');
    t.decimal('risk_score', 5, 2);
    t.enu('risk_band', ['low', 'medium', 'high', 'critical']);
    t.string('requested_method');
    t.string('selected_method');
    t.integer('step').notNullable().defaultTo(1);
    t.boolean('review_required').notNullable().defaultTo(false);
    t.string('review_reason');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('expires_at').notNullable();
    t.timestamp('completed_at');
    t.index(['user_id']);
  });

  await knex.schema.createTable('account_recovery_challenges', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('recovery_request_id').notNullable().references('id').inTable('account_recovery_requests').onDelete('CASCADE');
    t.string('challenge_type').notNullable();
    t.string('challenge_hash');
    t.integer('attempt_count').notNullable().defaultTo(0);
    t.integer('max_attempts').notNullable().defaultTo(5);
    t.timestamp('verified_at');
    t.timestamp('expires_at').notNullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['recovery_request_id']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('account_recovery_challenges');
  await knex.schema.dropTableIfExists('account_recovery_requests');
}
