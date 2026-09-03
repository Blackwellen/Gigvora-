import { Router } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './personalization.service.js';

const router = Router();

router.get(
  '/landing',
  asyncHandler(async (req, res) => {
    const { pageSlug, intent, anonymousSessionId } = req.query;
    if (!pageSlug) return res.status(422).json({ error: 'pageSlug is required' });

    try {
      const variant = await service.selectLandingVariant({
        pageSlug: String(pageSlug),
        intent: intent ? String(intent) : undefined,
        anonymousSessionId: anonymousSessionId ? String(anonymousSessionId) : undefined,
      });
      res.json({ data: variant });
    } catch (err) {
      // Personalisation must never break the public site — fail closed to
      // "no override" rather than surfacing a 500 to the page.
      req.log?.error?.({ err }, 'landing personalisation failed, falling back to default');
      res.json({ data: null });
    }
  })
);

export default router;
