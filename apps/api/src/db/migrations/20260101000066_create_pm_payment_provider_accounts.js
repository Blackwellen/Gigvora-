// Domain 18 Phase B — payment-provider account references needed to release
// a pm_payment_milestone. Stores only a provider account reference (a
// Stripe Connect account id), never card/bank details (spec §43) — actual
// bank/card data lives entirely inside Stripe, never in this database.
export async function up(knex) {
  await knex.schema.createTable('pm_payment_provider_accounts', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().unique().references('id').inTable('users').onDelete('CASCADE');
    t.string('provider').notNullable().defaultTo('stripe');
    t.string('external_account_id').notNullable();
    t.enu('status', ['pending', 'active', 'restricted']).notNullable().defaultTo('pending');
    t.timestamps(true, true);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('pm_payment_provider_accounts');
}
