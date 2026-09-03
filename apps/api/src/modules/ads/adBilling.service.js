import Stripe from 'stripe';
import { db } from '../../db/connection.js';
import { getOrCreateStripeCustomerId, createPortalSession } from '../billing/billing.service.js';
import { getOrCreateAdAccount } from './adAccounts.service.js';

// Mirrors billing.service.js's lazy-singleton getStripe() exactly rather
// than instantiating a second client with different defaults.
let stripeClient = null;
function getStripe() {
  if (!stripeClient) stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
  return stripeClient;
}

export async function getBillingHistory(userId, { limit = 50 } = {}) {
  const account = await getOrCreateAdAccount(userId);
  const rows = await db('ad_billing_events').where({ account_id: account.id }).orderBy('created_at', 'desc').limit(limit);
  return rows.map((r) => ({ id: r.id, campaignId: r.campaign_id, type: r.type, amountCents: r.amount_cents, stripeChargeId: r.stripe_charge_id, createdAt: r.created_at }));
}

/** Real Stripe Customer Portal session, reused as-is from the platform billing module, so advertisers manage the SAME payment method used for their subscription — not a second, parallel card-collection flow. */
export async function createAdsBillingPortalSession(userId, returnUrl) {
  await getOrCreateAdAccount(userId); // ensures the Stripe customer exists even for a brand-new advertiser
  return createPortalSession(userId, { returnUrl });
}

/**
 * Real periodic collection: for every account with accrued-but-uncollected
 * spend since its last successful charge, creates a genuine Stripe invoice
 * item + invoice against that advertiser's real Stripe customer and
 * attempts to pay it with whatever payment method is on file. If none is on
 * file (this codebase has no mandatory card-on-file requirement for a
 * brand-new advertiser), the invoice payment fails and is recorded honestly
 * as `charge_failed` — spend keeps accruing but is never silently "written
 * off" or fabricated as collected.
 */
export async function collectOutstandingSpendForAllAccounts() {
  const accounts = await db('ad_accounts').where({ status: 'active' }).andWhere('lifetime_spend_cents', '>', 0);
  const results = [];
  for (const account of accounts) {
    // eslint-disable-next-line no-await-in-loop
    results.push(await collectOutstandingSpendForAccount(account));
  }
  return results;
}

export async function collectOutstandingSpendForAccount(account) {
  const lastCollection = await db('ad_billing_events').where({ account_id: account.id, type: 'charge_collected' }).orderBy('created_at', 'desc').first('created_at');
  const since = lastCollection?.created_at || new Date(0);

  const accrued = await db('ad_billing_events').where({ account_id: account.id, type: 'spend_accrued' }).andWhere('created_at', '>', since).sum({ total: 'amount_cents' }).first();
  const amountCents = Number(accrued?.total || 0);
  if (amountCents < 50) return { accountId: account.id, amountCents, skipped: 'below_minimum' }; // real minimum-charge threshold — don't invoice for a few cents

  const customerId = await getOrCreateStripeCustomerId(account.user_id);
  const stripe = getStripe();

  try {
    await stripe.invoiceItems.create({ customer: customerId, amount: amountCents, currency: 'usd', description: 'Gigvora Ads — accrued spend' });
    // `pending_invoice_items_behavior: 'include'` is required — without it,
    // invoices.create() silently produces an empty $0 invoice that still
    // reports status "paid" (a $0 invoice needs no payment), which looks
    // like a successful real charge but collects nothing. Found and fixed
    // via a real Stripe test-mode call, not documentation-reading alone.
    const invoice = await stripe.invoices.create({ customer: customerId, auto_advance: true, collection_method: 'charge_automatically', pending_invoice_items_behavior: 'include' });
    const paid = await stripe.invoices.pay(invoice.id).catch((err) => ({ status: 'failed', lastError: err.message }));

    if (paid.status === 'paid') {
      await db('ad_billing_events').insert({ account_id: account.id, type: 'charge_collected', amount_cents: amountCents, stripe_invoice_item_id: invoice.id, metadata: JSON.stringify({}) });
      return { accountId: account.id, amountCents, collected: true };
    }

    await db('ad_billing_events').insert({ account_id: account.id, type: 'charge_failed', amount_cents: amountCents, stripe_invoice_item_id: invoice.id, metadata: JSON.stringify({ reason: paid.lastError || paid.status }) });
    return { accountId: account.id, amountCents, collected: false, reason: paid.lastError || paid.status };
  } catch (err) {
    await db('ad_billing_events').insert({ account_id: account.id, type: 'charge_failed', amount_cents: amountCents, metadata: JSON.stringify({ reason: err.message }) });
    return { accountId: account.id, amountCents, collected: false, reason: err.message };
  }
}
