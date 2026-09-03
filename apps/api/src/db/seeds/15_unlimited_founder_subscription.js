// Grants the founder/demo account (seeded by demo_admin_user.js) the
// internal-only 'unlimited' plan (see apps/api/src/modules/billing/entitlements.js
// PLAN_FEATURES.unlimited = ['*']) so every feature-gated surface (Sales
// Navigator, Enterprise Connect, etc.) is reachable when testing locally as
// this account. 'unlimited' is intentionally not present in billing_plans —
// it is never sold and only exists as a user_subscriptions row.
//
// user_subscriptions.stripe_subscription_id is NOT NULL + UNIQUE, so a
// clearly-fake, per-user sentinel is used instead of a real Stripe id.
const EMAIL = 'jamahlthomas1996@gmail.com';

export async function seed(knex) {
  const user = await knex('users').where({ email: EMAIL }).first();
  if (!user) {
    // eslint-disable-next-line no-console
    console.log(`Skipping unlimited founder subscription seed: no user found for ${EMAIL}`);
    return;
  }

  const sentinelSubscriptionId = `internal_unlimited_${user.id}`;
  const sentinelCustomerId = `internal_unlimited_customer_${user.id}`;

  const existing = await knex('user_subscriptions')
    .where({ user_id: user.id, plan_key: 'unlimited' })
    .first();

  if (existing) {
    await knex('user_subscriptions').where({ id: existing.id }).update({
      status: 'active',
      cancel_at_period_end: false,
      current_period_end: null,
      updated_at: knex.fn.now(),
    });
  } else {
    await knex('user_subscriptions')
      .insert({
        user_id: user.id,
        stripe_subscription_id: sentinelSubscriptionId,
        stripe_customer_id: sentinelCustomerId,
        plan_key: 'unlimited',
        status: 'active',
        current_period_end: null,
        cancel_at_period_end: false,
      })
      .onConflict('stripe_subscription_id')
      .merge({
        status: 'active',
        cancel_at_period_end: false,
        current_period_end: null,
        updated_at: knex.fn.now(),
      });
  }

  // eslint-disable-next-line no-console
  console.log(`Seeded 'unlimited' plan subscription for ${EMAIL} (user_id=${user.id}).`);
}
