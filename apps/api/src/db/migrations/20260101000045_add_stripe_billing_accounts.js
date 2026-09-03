// billing_plans/billing_addons (20260101000035) hold the product catalogue
// but nothing yet links a Gigvora user to a Stripe customer/subscription.
// Adds the minimal pair of tables needed for Checkout + Billing Portal +
// subscription webhooks, without touching the existing catalogue tables.
export async function up(knex) {
  await knex.schema.createTable('user_billing_accounts', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().unique().references('id').inTable('users').onDelete('CASCADE');
    t.string('stripe_customer_id').notNullable().unique();
    t.timestamps(true, true);
  });

  await knex.schema.createTable('user_subscriptions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('stripe_subscription_id').notNullable().unique();
    t.string('stripe_customer_id').notNullable();
    t.string('plan_key').nullable();
    t.string('status').notNullable(); // trialing | active | past_due | canceled | unpaid | incomplete | ...
    t.timestamp('current_period_end').nullable();
    t.boolean('cancel_at_period_end').notNullable().defaultTo(false);
    t.timestamps(true, true);
    t.index(['user_id']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('user_subscriptions');
  await knex.schema.dropTableIfExists('user_billing_accounts');
}
