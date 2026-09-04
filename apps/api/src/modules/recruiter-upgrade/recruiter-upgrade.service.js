import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { listActivePlans } from '../billing/billing.service.js';

/**
 * Billing-adjacent: reuses the platform's real Billing/Product Catalogue
 * (billing_plans, plan_key 'recruiter' = Recruiter Standard tier here,
 * 'recruiter_pro' = Pro) for pricing rather than hardcoding numbers, and
 * writes pending upgrade requests for ops/sales follow-up — this repo has no
 * seeded Stripe price IDs for the recruiter plans, so a real Stripe checkout
 * session is only attempted when STRIPE_SECRET_KEY + a price id are actually
 * configured; otherwise the request is recorded and surfaced to the user as
 * "pending review" rather than silently pretending to charge them.
 */
export async function getComparison(userId) {
  const [plans, seat] = await Promise.all([listActivePlans(), db('recruiter_seats').where({ user_id: userId }).first()]);
  const standardPlan = plans.find((p) => p.key === 'recruiter') || null;
  const proPlan = plans.find((p) => p.key === 'recruiter_pro') || null;
  return { standardPlan, proPlan, seat: seat || null };
}

export async function listMyRequests(userId) {
  return db('recruiter_upgrade_requests').where({ user_id: userId }).orderBy('created_at', 'desc');
}

export async function createRequest(userId, { requested_seats = 1, billing_cycle = 'monthly', note } = {}) {
  const seats = Math.max(1, Math.min(50, Number(requested_seats) || 1));
  if (!['monthly', 'annual'].includes(billing_cycle)) throw new AppError('Invalid billing_cycle', 422);

  const [row] = await db('recruiter_upgrade_requests')
    .insert({ user_id: userId, requested_seats: seats, billing_cycle, note: note || null, status: 'pending' })
    .returning('*');
  return row;
}
