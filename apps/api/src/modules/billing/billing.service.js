import Stripe from 'stripe';
import { db } from '../../db/connection.js';
import { config } from '../../config/index.js';
import { AppError } from '../../common/errors/AppError.js';
import { featuresForPlan } from './entitlements.js';

// This codebase has no established NODE_ENV-based test/live Stripe key
// toggle (only STRIPE_SECRET_KEY is read anywhere else), so STRIPE_SECRET_KEY
// is treated as the working key per the existing .env convention. Built
// lazily (not at module load) so importing this module never fails in an
// environment where Stripe isn't configured (e.g. unit tests).
let stripeClient;
function getStripe() {
  if (!stripeClient) {
    if (!process.env.STRIPE_SECRET_KEY) throw new AppError('Stripe is not configured', 500);
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
  }
  return stripeClient;
}

function toMoney(cents, currency) {
  if (cents == null) return null;
  return { cents, currency, formatted: `$${(cents / 100).toFixed(0)}` };
}

function toPlan(row) {
  return {
    key: row.plan_key,
    name: row.name,
    audience: row.audience,
    tagline: row.tagline,
    isCustomPrice: row.is_custom_price,
    monthlyPrice: toMoney(row.monthly_price_cents, row.currency),
    annualPrice: toMoney(row.annual_price_cents, row.currency),
    mostPopular: row.most_popular,
    features: row.features,
    limits: row.limits,
    ctaLabel: row.cta_label,
    ctaAction: row.cta_action,
  };
}

// The canonical Billing/Product Catalogue — the ONLY authoritative source
// for plan prices. CMS/marketing copy must never override what's returned
// here.
export async function listActivePlans() {
  const rows = await db('billing_plans').where({ is_active: true }).orderBy('order_index', 'asc');
  return rows.map(toPlan);
}

export async function listActiveAddons() {
  const rows = await db('billing_addons').orderBy('order_index', 'asc');
  return rows.map((row) => ({
    key: row.addon_key,
    name: row.name,
    price: toMoney(row.price_cents, row.currency),
    unitLabel: row.unit_label,
  }));
}

/**
 * Looks up (or lazily creates) the Stripe customer for a Gigvora user,
 * persisting the mapping in user_billing_accounts.
 */
export async function getOrCreateStripeCustomerId(userId) {
  const existing = await db('user_billing_accounts').where({ user_id: userId }).first();
  if (existing) return existing.stripe_customer_id;

  const user = await db('users').where({ id: userId }).first('id', 'email', 'first_name', 'last_name');
  if (!user) throw new AppError('users not found', 404);

  const customer = await getStripe().customers.create({
    email: user.email,
    name: `${user.first_name} ${user.last_name}`.trim(),
    metadata: { userId: user.id },
  });

  await db('user_billing_accounts')
    .insert({ user_id: userId, stripe_customer_id: customer.id })
    // Guards against a race between two concurrent requests both creating a customer for the same user.
    .onConflict('user_id')
    .ignore();

  const row = await db('user_billing_accounts').where({ user_id: userId }).first();
  return row.stripe_customer_id;
}

export async function createCheckoutSession(userId, { mode = 'subscription', priceId, quantity = 1, successUrl, cancelUrl } = {}) {
  if (!priceId) throw new AppError('priceId is required', 422);
  if (!['subscription', 'payment'].includes(mode)) throw new AppError('mode must be "subscription" or "payment"', 422);

  const customerId = await getOrCreateStripeCustomerId(userId);

  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode,
    line_items: [{ price: priceId, quantity }],
    success_url: successUrl || `${config.webUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl || `${config.webUrl}/billing/cancelled`,
    client_reference_id: userId,
    metadata: { userId },
  });

  return { url: session.url };
}

export async function createPortalSession(userId, { returnUrl } = {}) {
  const customerId = await getOrCreateStripeCustomerId(userId);

  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl || `${config.webUrl}/settings/billing`,
  });

  return { url: session.url };
}

/**
 * Resolves a user's current plan and feature entitlements. Looks up the most
 * recent active/trialing subscription; falls back to the 'free' plan (no
 * features) when the user has no subscription row at all. Returned shape is
 * plain/serialisable — callers compute hasFeature(features, key) themselves
 * (see entitlements.js) rather than receiving a bound function.
 */
export async function getUserEntitlements(userId) {
  const subscription = await db('user_subscriptions')
    .where({ user_id: userId })
    .whereIn('status', ['active', 'trialing'])
    .orderBy('current_period_end', 'desc')
    .orderBy('updated_at', 'desc')
    .first();

  const planKey = subscription?.plan_key || 'free';
  const status = subscription?.status || 'free';
  const features = featuresForPlan(planKey);

  return { planKey, status, features };
}

export function constructWebhookEvent(rawBody, signature) {
  if (!process.env.STRIPE_WEBHOOK_SECRET) throw new AppError('Stripe webhook secret is not configured', 500);
  return getStripe().webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
}

async function upsertSubscriptionFromStripe(subscription) {
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
  const account = await db('user_billing_accounts').where({ stripe_customer_id: customerId }).first();
  const userId = account?.user_id || subscription.metadata?.userId || null;
  if (!userId) return;

  const planKey = subscription.items?.data?.[0]?.price?.lookup_key || subscription.items?.data?.[0]?.price?.id || null;

  await db('user_subscriptions')
    .insert({
      user_id: userId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: customerId,
      plan_key: planKey,
      status: subscription.status,
      current_period_end: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null,
      cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
    })
    .onConflict('stripe_subscription_id')
    .merge({
      plan_key: planKey,
      status: subscription.status,
      current_period_end: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null,
      cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
      updated_at: db.fn.now(),
    });
}

/**
 * Applies a verified Stripe webhook event to user_subscriptions /
 * user_billing_accounts. Called from the raw-body webhook route after
 * constructWebhookEvent() has already verified the signature.
 */
export async function handleWebhookEvent(event) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const userId = session.client_reference_id || session.metadata?.userId;
      const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
      if (userId && customerId) {
        await db('user_billing_accounts')
          .insert({ user_id: userId, stripe_customer_id: customerId })
          .onConflict('user_id')
          .merge({ stripe_customer_id: customerId, updated_at: db.fn.now() });
      }
      if (session.subscription) {
        const subscription = await getStripe().subscriptions.retrieve(session.subscription);
        await upsertSubscriptionFromStripe(subscription);
      }
      break;
    }
    case 'customer.subscription.updated': {
      await upsertSubscriptionFromStripe(event.data.object);
      break;
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      await db('user_subscriptions')
        .where({ stripe_subscription_id: subscription.id })
        .update({ status: 'canceled', cancel_at_period_end: false, updated_at: db.fn.now() });
      break;
    }
    default:
      break;
  }
}
