import { Router } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { requireAuth } from '../../common/middleware/auth.js';
import * as service from './billing.service.js';
import { checkoutSessionHandler, portalSessionHandler } from './billing.controller.js';

const router = Router();

router.get(
  '/plans',
  asyncHandler(async (req, res) => {
    const [plans, addons] = await Promise.all([service.listActivePlans(), service.listActiveAddons()]);
    res.json({ data: { plans, addons } });
  })
);

export default router;

// Authenticated Stripe billing endpoints (checkout/portal), mounted at
// /api/v1/billing — kept separate from the /public/billing catalogue router
// above, which stays anonymous-readable.
export const authRouter = Router();
authRouter.use(requireAuth);
authRouter.post('/checkout-session', checkoutSessionHandler);
authRouter.post('/portal-session', portalSessionHandler);
