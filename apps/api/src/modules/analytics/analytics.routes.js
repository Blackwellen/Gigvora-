import { Router } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { authRateLimit } from '../../common/middleware/authRateLimit.js';
import * as service from './analytics.service.js';

const router = Router();

router.post(
  '/events',
  authRateLimit({ keyPrefix: 'public-analytics', windowSeconds: 60, max: 120 }),
  asyncHandler(async (req, res) => {
    const { eventName, surface, objectType, objectId, source, referrer, utm, properties, anonymousSessionId } = req.body || {};
    if (!eventName || !anonymousSessionId) {
      return res.status(422).json({ error: 'eventName and anonymousSessionId are required' });
    }

    await service.recordConversionEvent({
      eventName,
      surface,
      objectType,
      objectId,
      source,
      referrer,
      utmSource: utm?.source,
      utmMedium: utm?.medium,
      utmCampaign: utm?.campaign,
      utmContent: utm?.content,
      utmTerm: utm?.term,
      properties,
      anonymousSessionId,
    });

    res.status(202).json({ data: { received: true } });
  })
);

export default router;
