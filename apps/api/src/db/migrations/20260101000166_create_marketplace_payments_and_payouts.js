// Domain 26 — payments/payouts. Gigvora never custodies buyer funds itself;
// marketplace_payments mirrors a Stripe PaymentIntent (or future PSP) and
// marketplace_payment_allocations is the per-seller split-settlement ledger
// derived from it, driving seller_payouts. Seller payout destination reuses
// `pm_payment_provider_accounts` (Domain 18's Stripe Connect account table)
// rather than duplicating Connect-account storage.
export async function up(knex) {
  await knex.schema.createTable('marketplace_payments', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('order_id').notNullable().references('id').inTable('marketplace_orders').onDelete('CASCADE');
    t.string('provider').notNullable().defaultTo('stripe');
    t.string('provider_payment_ref').notNullable();
    t.enu('status', ['requires_action', 'authorized', 'captured', 'partially_refunded', 'refunded', 'failed', 'cancelled']).notNullable().defaultTo('requires_action');
    t.integer('amount_cents').notNullable();
    t.integer('captured_amount_cents').notNullable().defaultTo(0);
    t.integer('refunded_amount_cents').notNullable().defaultTo(0);
    t.text('metadata_json').nullable();
    t.timestamps(true, true);
    t.index(['order_id']);
    t.unique(['provider', 'provider_payment_ref']);
  });

  await knex.schema.createTable('marketplace_payment_allocations', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('payment_id').notNullable().references('id').inTable('marketplace_payments').onDelete('CASCADE');
    t.uuid('shop_id').notNullable().references('id').inTable('marketplace_shops').onDelete('RESTRICT');
    t.uuid('seller_id').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.integer('gross_amount_cents').notNullable();
    t.integer('platform_fee_cents').notNullable().defaultTo(0);
    t.integer('seller_amount_cents').notNullable();
    t.enu('release_status', ['held', 'scheduled', 'released', 'reversed']).notNullable().defaultTo('held');
    t.timestamp('release_at').nullable();
    t.timestamps(true, true);
    t.index(['seller_id']);
    t.index(['shop_id']);
  });

  await knex.schema.createTable('seller_payouts', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('shop_id').notNullable().references('id').inTable('marketplace_shops').onDelete('CASCADE');
    t.uuid('seller_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('provider').notNullable().defaultTo('stripe');
    t.string('provider_payout_ref').nullable();
    t.integer('amount_cents').notNullable();
    t.string('currency', 3).notNullable().defaultTo('usd');
    t.enu('status', ['pending', 'processing', 'paid', 'failed', 'held']).notNullable().defaultTo('pending');
    t.timestamp('paid_at').nullable();
    t.timestamps(true, true);
    t.index(['seller_id']);
    t.index(['status']);
  });

  await knex.schema.createTable('seller_payout_items', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('payout_id').notNullable().references('id').inTable('seller_payouts').onDelete('CASCADE');
    t.uuid('allocation_id').notNullable().references('id').inTable('marketplace_payment_allocations').onDelete('RESTRICT');
    t.integer('amount_cents').notNullable();
    t.timestamps(true, true);
  });

  await knex.schema.createTable('refunds', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('order_id').notNullable().references('id').inTable('marketplace_orders').onDelete('CASCADE');
    t.uuid('payment_id').notNullable().references('id').inTable('marketplace_payments').onDelete('CASCADE');
    t.uuid('order_item_id').nullable().references('id').inTable('marketplace_order_items').onDelete('SET NULL');
    t.uuid('initiated_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.integer('amount_cents').notNullable();
    t.string('reason').nullable();
    t.enu('status', ['pending', 'processing', 'succeeded', 'failed']).notNullable().defaultTo('pending');
    t.string('provider_refund_ref').nullable();
    t.timestamps(true, true);
    t.index(['order_id']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('refunds');
  await knex.schema.dropTableIfExists('seller_payout_items');
  await knex.schema.dropTableIfExists('seller_payouts');
  await knex.schema.dropTableIfExists('marketplace_payment_allocations');
  await knex.schema.dropTableIfExists('marketplace_payments');
}
