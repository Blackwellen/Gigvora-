import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { createAdsBillingPortalSession } from './adBilling.service.js';

export const createBillingPortalHandler = asyncHandler(async (req, res) => {
  const data = await createAdsBillingPortalSession(req.user.sub, req.body?.returnUrl);
  res.json({ data });
});
