export async function up(knex) {
  await knex.schema.createTable('security_alerts', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    t.uuid('security_event_id').references('id').inTable('security_events').onDelete('SET NULL');
    t.string('alert_type').notNullable();
    t.string('fingerprint').notNullable();
    t.enu('severity', ['low', 'medium', 'high', 'critical']).notNullable().defaultTo('medium');
    t.enu('status', ['open', 'investigating', 'resolved', 'dismissed']).notNullable().defaultTo('open');
    t.decimal('risk_score', 5, 2);
    t.string('title').notNullable();
    t.text('summary');
    t.integer('occurrence_count').notNullable().defaultTo(1);
    t.timestamp('first_seen_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('last_seen_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('resolved_at');
    t.uuid('resolved_by');
    t.string('resolution_reason');
    t.jsonb('metadata').notNullable().defaultTo('{}');
    t.timestamps(true, true);
    t.index(['user_id']);
    t.index(['status']);
    t.index(['severity']);
    t.unique(['fingerprint']);
  });

  await knex.schema.createTable('security_alert_notes', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('security_alert_id').notNullable().references('id').inTable('security_alerts').onDelete('CASCADE');
    t.uuid('author_user_id').notNullable().references('id').inTable('users');
    t.text('body').notNullable();
    t.timestamps(true, true);
    t.index(['security_alert_id']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('security_alert_notes');
  await knex.schema.dropTableIfExists('security_alerts');
}
