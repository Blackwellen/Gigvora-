import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { AppError } from '../../common/errors/AppError.js';
import * as service from './billing.service.js';

export const checkoutSessionHandler = asyncHandler(async (req, res) => {
  const { mode, priceId, quantity, successUrl, cancelUrl } = req.body;
  const data = await service.createCheckoutSession(req.user.sub, { mode, priceId, quantity, successUrl, cancelUrl });
  res.json({ data });
});

export const portalSessionHandler = asyncHandler(async (req, res) => {
  const { returnUrl } = req.body;
  const data = await service.createPortalSession(req.user.sub, { returnUrl });
  res.json({ data });
});

// Mounted with express.raw() directly on the app (see server.js), ahead of
// the global express.json() parser, so req.body here is the raw Buffer
// Stripe's signature verification requires.
export const stripeWebhookHandler = asyncHandler(async (req, res) => {
  const signature = req.headers['stripe-signature'];
  if (!signature) throw new AppError('Missing stripe-signature header', 400);

  let event;
  try {
    event = service.constructWebhookEvent(req.body, signature);
  } catch (err) {
    throw new AppError(`Webhook signature verification failed: ${err.message}`, 400);
  }

  await service.handleWebhookEvent(event);
  res.json({ received: true });
});
