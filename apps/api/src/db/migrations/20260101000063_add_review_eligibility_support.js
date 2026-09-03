// Domain 14 Reviews (§26-27) must validate that a review corresponds to a
// real, completed engagement — but neither `projects` nor `gigs` (both
// minimal marketplace stubs, see their own migration comments) record who
// was actually hired/delivered the work. This migration adds the minimal
// additive linkage needed for that server-side eligibility check, plus a
// `service_bookings` table backing the `service_booking` review context
// (Domain 14 owns `professional_services`, so it owns the booking record
// that reviews validate against too).
export async function up(knex) {
  await knex.schema.alterTable('projects', (t) => {
    t.uuid('assigned_professional_id').nullable().references('id').inTable('users').onDelete('SET NULL');
  });
  await knex.schema.alterTable('gigs', (t) => {
    t.uuid('assigned_professional_id').nullable().references('id').inTable('users').onDelete('SET NULL');
  });

  await knex.schema.createTable('service_bookings', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('service_id').notNullable().references('id').inTable('professional_services').onDelete('CASCADE');
    t.uuid('package_id').nullable().references('id').inTable('service_packages').onDelete('SET NULL');
    t.uuid('profile_id').notNullable().references('id').inTable('profiles').onDelete('CASCADE');
    t.uuid('client_user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.enu('status', ['requested', 'accepted', 'in_progress', 'completed', 'cancelled']).notNullable().defaultTo('requested');
    t.timestamp('completed_at');
    t.timestamps(true, true);
  });
  await knex.schema.alterTable('service_bookings', (t) => {
    t.index(['profile_id', 'status']);
    t.index(['client_user_id']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('service_bookings');
  await knex.schema.alterTable('gigs', (t) => t.dropColumn('assigned_professional_id'));
  await knex.schema.alterTable('projects', (t) => t.dropColumn('assigned_professional_id'));
}
