// Domain 18 Phase B/C — Milestone payment protection & escrow (18.30).
// Real Stripe calls throughout — an authorize-then-capture escrow pattern,
// not a fake internal wallet:
//   funding:  Stripe Checkout Session, PaymentIntent created with
//             capture_method: 'manual' -> funds are authorized/held on the
//             payer's card but NOT captured — this is the actual "escrow"
//             (Stripe holds the authorization; we hold nothing ourselves).
//   release:  capture the PaymentIntent (money now actually moves to the
//             platform's Stripe balance), then transfer it onward to the
//             payee's connected account. Only after BOTH provider calls
//             succeed is status flipped to 'released'.
//   dispute:  handled entirely by modules/disputes — opening one there
//             flips this row to 'disputed', which blocks /release; a
//             resolution there hands control back here via
//             release_pending/refunded, but never moves money itself.
//
// Whether these calls actually succeed still depends on Stripe Connect
// being configured and the payee having completed onboarding (checked
// explicitly, reported as a clear 422, never silently marked funded/
// released) — exactly like billing.service.js already depends on
// STRIPE_SECRET_KEY being set.
import { Router } from 'express';
import { randomUUID } from 'crypto';
import Stripe from 'stripe';
import { db } from '../../db/connection.js';
import { config } from '../../config/index.js';
import { AppError } from '../../common/errors/AppError.js';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { emitEvent } from '../../common/events/outbox.js';
import { loadProjectContext } from './shared.js';
import { canEditProject, assertPermission } from './permissions.js';

let stripeClient;
function getStripe() {
  if (!stripeClient) {
    if (!process.env.STRIPE_SECRET_KEY) throw new AppError('Stripe is not configured', 500);
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
  }
  return stripeClient;
}

function serialize(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    milestoneId: row.milestone_id,
    payeeUserId: row.payee_user_id,
    amount: Number(row.amount),
    currency: row.currency,
    status: row.status,
    provider: row.provider,
    providerPaymentIntentId: row.provider_payment_intent_id,
    providerTransferId: row.provider_transfer_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// 'disputed' and 'refunded' are no longer directly PATCH-able — a dispute
// must be opened through modules/disputes (which then flips this status
// itself), so there's always a reason/evidence trail behind either state.
const FORWARD_TRANSITIONS = {
  draft: [],
  funded: ['in_progress'],
  in_progress: ['submitted'],
  submitted: ['accepted'],
  accepted: ['release_pending'],
  release_pending: [],
  released: [],
  disputed: [],
  refunded: [],
};

async function assertAccess(projectId, userId) {
  const { membership } = await loadProjectContext(projectId, userId);
  assertPermission(Boolean(membership), 'You do not have access to this project');
  return membership;
}

export const router = Router({ mergeParams: true });

router.get('/', asyncHandler(async (req, res) => {
  await assertAccess(req.params.id, req.user.sub);
  const rows = await db('pm_payment_milestones').where({ project_id: req.params.id }).orderBy('created_at', 'asc');
  res.json({ data: rows.map(serialize) });
}));

router.post('/', asyncHandler(async (req, res) => {
  const membership = await assertAccess(req.params.id, req.user.sub);
  assertPermission(canEditProject(membership), 'You do not have permission to set up payment protection');

  const { milestoneId, payeeUserId, amount, currency = 'USD' } = req.body;
  if (!milestoneId || !payeeUserId || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
    throw new AppError('milestoneId, payeeUserId, and a positive amount are required', 422);
  }
  const milestone = await db('pm_milestones').where({ id: milestoneId, project_id: req.params.id }).first();
  if (!milestone) throw new AppError('Milestone not found on this project', 404);

  const existing = await db('pm_payment_milestones').where({ milestone_id: milestoneId }).first();
  if (existing) throw new AppError('This milestone already has payment protection set up', 409);

  const [row] = await db('pm_payment_milestones').insert({ project_id: req.params.id, milestone_id: milestoneId, payee_user_id: payeeUserId, amount, currency }).returning('*');
  res.status(201).json({ data: serialize(row) });
}));

/** Step 1 of funding — creates a hosted Stripe Checkout page that authorizes (but does not
 * capture) the milestone amount on the payer's card, i.e. puts it into escrow. */
router.post('/:paymentMilestoneId/checkout-session', asyncHandler(async (req, res) => {
  const membership = await assertAccess(req.params.id, req.user.sub);
  assertPermission(canEditProject(membership), 'Only a project manager can fund payment protection');

  const milestone = await db('pm_payment_milestones').where({ id: req.params.paymentMilestoneId, project_id: req.params.id }).first();
  if (!milestone) throw new AppError('Payment milestone not found', 404);
  if (milestone.status !== 'draft') throw new AppError(`This payment milestone is already "${milestone.status}"`, 422);

  const project = await db('pm_projects').where({ id: req.params.id }).first('name');
  const session = await getStripe().checkout.sessions.create({
    mode: 'payment',
    payment_intent_data: { capture_method: 'manual', metadata: { paymentMilestoneId: milestone.id, projectId: req.params.id } },
    line_items: [
      {
        price_data: {
          currency: milestone.currency.toLowerCase(),
          product_data: { name: `${project.name} — milestone payment protection` },
          unit_amount: Math.round(Number(milestone.amount) * 100),
        },
        quantity: 1,
      },
    ],
    success_url: `${config.webUrl}/app/project-payments?projectId=${req.params.id}&fundedSessionId={CHECKOUT_SESSION_ID}&fundedMilestoneId=${milestone.id}`,
    cancel_url: `${config.webUrl}/app/project-payments?projectId=${req.params.id}`,
    metadata: { paymentMilestoneId: milestone.id },
  });

  res.json({ data: { url: session.url } });
}));

/** Step 2 of funding — called when the browser returns from Stripe Checkout; verifies the
 * session actually authorized the funds before marking this milestone "funded". */
router.post('/:paymentMilestoneId/confirm-funding', asyncHandler(async (req, res) => {
  const membership = await assertAccess(req.params.id, req.user.sub);
  assertPermission(canEditProject(membership), 'Only a project manager can confirm funding');
  const { sessionId } = req.body;
  if (!sessionId) throw new AppError('sessionId is required', 422);

  return db.transaction(async (trx) => {
    const existing = await trx('pm_payment_milestones').where({ id: req.params.paymentMilestoneId, project_id: req.params.id }).forUpdate().first();
    if (!existing) throw new AppError('Payment milestone not found', 404);
    if (existing.status !== 'draft') {
      // Already confirmed (e.g. the success page reloaded) — idempotent no-op rather than an error.
      res.json({ data: serialize(existing) });
      return;
    }

    const session = await getStripe().checkout.sessions.retrieve(sessionId, { expand: ['payment_intent'] });
    if (session.metadata?.paymentMilestoneId !== existing.id) throw new AppError('This checkout session does not match this payment milestone', 422);

    const paymentIntent = session.payment_intent;
    if (!paymentIntent || paymentIntent.status !== 'requires_capture') {
      throw new AppError(`Funds have not been authorized yet (payment intent status: "${paymentIntent?.status || 'unknown'}")`, 422, { code: 'FUNDING_NOT_AUTHORIZED' });
    }

    const [updated] = await trx('pm_payment_milestones')
      .where({ id: existing.id, version: existing.version })
      .update({ status: 'funded', provider_payment_intent_id: paymentIntent.id, version: existing.version + 1 })
      .returning('*');
    if (!updated) throw new AppError('Version conflict while confirming funding', 409, { code: 'VERSION_CONFLICT' });

    await trx('pm_payment_ledger_entries').insert({ payment_milestone_id: existing.id, entry_type: 'secured', amount: existing.amount, provider_reference: paymentIntent.id, metadata: JSON.stringify({ sessionId }) });
    await emitEvent({ aggregateType: 'pm_payment_milestone', aggregateId: existing.id, eventType: 'project.payment_secured', payload: { projectId: req.params.id } }, trx);

    res.json({ data: serialize(updated) });
  });
}));

/** Any forward, non-release transition (funded->in_progress->submitted->accepted->release_pending). */
router.patch('/:paymentMilestoneId', asyncHandler(async (req, res) => {
  const membership = await assertAccess(req.params.id, req.user.sub);
  const { status } = req.body;

  return db.transaction(async (trx) => {
    const existing = await trx('pm_payment_milestones').where({ id: req.params.paymentMilestoneId, project_id: req.params.id }).forUpdate().first();
    if (!existing) throw new AppError('Payment milestone not found', 404);

    const allowed = FORWARD_TRANSITIONS[existing.status] || [];
    if (!allowed.includes(status)) throw new AppError(`Cannot move a payment milestone from "${existing.status}" to "${status}"`, 422, { code: 'INVALID_TRANSITION', allowed });

    // Accepting/moving to release_pending is a manager decision; submitting is the payee's own action.
    if (status === 'submitted') assertPermission(existing.payee_user_id === req.user.sub || canEditProject(membership), 'Only the payee or a project manager can submit this milestone');
    else assertPermission(canEditProject(membership), 'Only a project manager can change this payment milestone');

    const [updated] = await trx('pm_payment_milestones').where({ id: existing.id, version: existing.version }).update({ status, version: existing.version + 1 }).returning('*');
    if (!updated) throw new AppError('This payment milestone was updated by someone else — please refresh', 409, { code: 'VERSION_CONFLICT' });

    const eventType = status === 'release_pending' ? 'project.payment_release_requested' : 'project.payment_milestone_updated';
    await emitEvent({ aggregateType: 'pm_payment_milestone', aggregateId: updated.id, eventType, payload: { projectId: req.params.id, status } }, trx);
    res.json({ data: serialize(updated) });
  });
}));

router.post('/:paymentMilestoneId/release', asyncHandler(async (req, res) => {
  // 1. Permission
  const membership = await assertAccess(req.params.id, req.user.sub);
  assertPermission(canEditProject(membership), 'Only a project manager can release a payment');

  return db.transaction(async (trx) => {
    // 4. Row lock — prevents a second concurrent release request for the same milestone.
    const existing = await trx('pm_payment_milestones').where({ id: req.params.paymentMilestoneId, project_id: req.params.id }).forUpdate().first();
    if (!existing) throw new AppError('Payment milestone not found', 404);

    // 2. Status check
    if (existing.status !== 'release_pending') {
      throw new AppError(`A payment milestone must be in "release_pending" to be released (currently "${existing.status}")`, 422, { code: 'INVALID_TRANSITION' });
    }
    if (!existing.provider_payment_intent_id) {
      throw new AppError('This payment milestone has no authorized funds on file — it was never actually funded', 422, { code: 'NOT_FUNDED' });
    }

    // 3. Amount check — the client cannot override the amount; it's read from the stored row only.
    const amountCents = Math.round(Number(existing.amount) * 100);
    if (amountCents <= 0) throw new AppError('Invalid payment amount', 422);

    const payeeAccount = await trx('pm_payment_provider_accounts').where({ user_id: existing.payee_user_id, status: 'active' }).first();
    if (!payeeAccount) {
      throw new AppError('The payee has not completed payment setup with the provider yet — release cannot proceed', 422, { code: 'PAYEE_NOT_ONBOARDED' });
    }

    // 5. Idempotency key — stable per payment milestone so a retried request
    // (network blip, duplicate click) can never double-release.
    const idempotencyKey = existing.idempotency_key || `pm-release-${existing.id}-${randomUUID()}`;
    if (!existing.idempotency_key) await trx('pm_payment_milestones').where({ id: existing.id }).update({ idempotency_key: idempotencyKey });

    // 6a. Capture the held authorization — this is the moment money actually
    // moves (from the payer's card into the platform's Stripe balance). A
    // PaymentIntent already captured (e.g. a retried request) is fetched
    // instead of re-captured, since Stripe rejects a second capture outright.
    const stripe = getStripe();
    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.capture(existing.provider_payment_intent_id, {}, { idempotencyKey: `${idempotencyKey}-capture` });
    } catch (err) {
      if (err.code === 'payment_intent_unexpected_state') {
        paymentIntent = await stripe.paymentIntents.retrieve(existing.provider_payment_intent_id);
      } else {
        await emitEvent({ aggregateType: 'pm_payment_milestone', aggregateId: existing.id, eventType: 'project.payment_release_failed', payload: { projectId: req.params.id, stage: 'capture', error: err.message } }, trx);
        throw new AppError('The payment provider declined this capture — no funds were moved', 502, { code: 'PROVIDER_CAPTURE_FAILED' });
      }
    }
    if (paymentIntent.status !== 'succeeded') {
      throw new AppError(`Capture did not succeed (status: "${paymentIntent.status}")`, 502, { code: 'PROVIDER_CAPTURE_FAILED' });
    }
    await trx('pm_payment_ledger_entries').insert({ payment_milestone_id: existing.id, entry_type: 'authorized', amount: existing.amount, provider_reference: paymentIntent.id, metadata: JSON.stringify({ idempotencyKey }) });

    // 6b. Transfer the now-captured funds onward to the payee's connected account.
    let transfer;
    try {
      transfer = await stripe.transfers.create(
        { amount: amountCents, currency: existing.currency.toLowerCase(), destination: payeeAccount.external_account_id, transfer_group: `pm-milestone-${existing.milestone_id}` },
        { idempotencyKey: `${idempotencyKey}-transfer` }
      );
    } catch (err) {
      // Funds are captured but not yet forwarded — status is deliberately NOT
      // moved to 'released' here; an operator can retry the release safely
      // since the capture step above is now a no-op on retry.
      await emitEvent({ aggregateType: 'pm_payment_milestone', aggregateId: existing.id, eventType: 'project.payment_release_failed', payload: { projectId: req.params.id, stage: 'transfer', error: err.message } }, trx);
      throw new AppError('Funds were captured but the transfer to the payee failed — please retry the release', 502, { code: 'PROVIDER_TRANSFER_FAILED' });
    }

    // 7-8. Record provider reference + commit internal state — NEVER marked
    // released before this point, i.e. only after both provider calls above
    // have actually returned success.
    const [updated] = await trx('pm_payment_milestones')
      .where({ id: existing.id, version: existing.version })
      .update({ status: 'released', provider_transfer_id: transfer.id, version: existing.version + 1 })
      .returning('*');
    if (!updated) throw new AppError('Version conflict while committing the release', 409, { code: 'VERSION_CONFLICT' });

    // 9. Ledger entry — immutable financial record independent of pm_payment_milestones' mutable status column.
    await trx('pm_payment_ledger_entries').insert({ payment_milestone_id: existing.id, entry_type: 'released', amount: existing.amount, provider_reference: transfer.id, metadata: JSON.stringify({ idempotencyKey }) });

    // 10. Audit event (immutable, via the durable outbox row) + 12. realtime
    // broadcast happens downstream of this same outbox event via the
    // project-events bridge; 11. notification dispatch is a consumer of it.
    await emitEvent({ aggregateType: 'pm_payment_milestone', aggregateId: existing.id, eventType: 'project.payment_released', payload: { projectId: req.params.id, milestoneId: existing.milestone_id, amount: existing.amount, transferId: transfer.id } }, trx);

    res.json({ data: serialize(updated) });
  });
}));

export default router;
