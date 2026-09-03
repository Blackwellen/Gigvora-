export async function up(knex) {
  await knex.schema.createTable('offers', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('application_id').notNullable().references('id').inTable('applications').onDelete('CASCADE');
    t.uuid('job_id').notNullable().references('id').inTable('jobs').onDelete('CASCADE');
    t.decimal('base_salary', 12, 2).nullable();
    t.decimal('bonus', 12, 2).nullable();
    t.string('equity').nullable();
    t.string('currency').notNullable().defaultTo('USD');
    t.date('start_date').nullable();
    t.enu('status', ['draft', 'sent', 'negotiating', 'accepted', 'declined', 'rescinded', 'expired']).notNullable().defaultTo('draft');
    t.jsonb('benefits').notNullable().defaultTo('[]');
    t.uuid('created_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.timestamp('expires_at').nullable();
    t.timestamps(true, true);
    t.index(['application_id'], 'offers_application_id_idx');
    t.index(['job_id'], 'offers_job_id_idx');
    t.index(['status'], 'offers_status_idx');
  });

  await knex.schema.createTable('offer_versions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('offer_id').notNullable().references('id').inTable('offers').onDelete('CASCADE');
    t.integer('version_number').notNullable();
    t.jsonb('changes').notNullable().defaultTo('{}');
    t.uuid('created_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['offer_id', 'created_at'], 'offer_versions_offer_created_idx');
  });

  await knex.schema.createTable('offer_approvals', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('offer_id').notNullable().references('id').inTable('offers').onDelete('CASCADE');
    t.uuid('approver_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.enu('decision', ['pending', 'approved', 'rejected']).notNullable().defaultTo('pending');
    t.text('notes').nullable();
    t.timestamps(true, true);
    t.index(['offer_id'], 'offer_approvals_offer_id_idx');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('offer_approvals');
  await knex.schema.dropTableIfExists('offer_versions');
  await knex.schema.dropTableIfExists('offers');
}
