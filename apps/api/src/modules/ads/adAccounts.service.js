import { db } from '../../db/connection.js';
import { getOrCreateStripeCustomerId } from '../billing/billing.service.js';

/** Every advertiser gets exactly one ad account, created lazily on first real use — mirrors getOrCreateStripeCustomerId's race-safe upsert pattern. */
export async function getOrCreateAdAccount(userId) {
  const existing = await db('ad_accounts').where({ user_id: userId }).first();
  if (existing) return existing;

  // Ensures a real Stripe customer exists for this advertiser up front —
  // billing.js reuses this same customer id when collecting ad spend, no
  // separate ads-specific Stripe customer is created.
  await getOrCreateStripeCustomerId(userId);

  await db('ad_accounts').insert({ user_id: userId }).onConflict('user_id').ignore();
  return db('ad_accounts').where({ user_id: userId }).first();
}

export async function getAccountSummary(userId) {
  const account = await getOrCreateAdAccount(userId);

  const [campaignCounts, spendToday, spendThisMonth] = await Promise.all([
    db('ad_campaigns').where({ account_id: account.id }).select('status').count('id as count').groupBy('status'),
    db('ad_campaigns').where({ account_id: account.id }).sum({ total: 'spent_today_cents' }).first(),
    db('ad_billing_events')
      .where({ account_id: account.id, type: 'spend_accrued' })
      .andWhere('created_at', '>=', db.raw("date_trunc('month', now())"))
      .sum({ total: 'amount_cents' })
      .first(),
  ]);

  const statusCounts = Object.fromEntries(campaignCounts.map((r) => [r.status, Number(r.count)]));

  return {
    accountId: account.id,
    status: account.status,
    lifetimeSpendCents: account.lifetime_spend_cents,
    spendTodayCents: Number(spendToday?.total || 0),
    spendThisMonthCents: Number(spendThisMonth?.total || 0),
    campaignCounts: statusCounts,
  };
}
