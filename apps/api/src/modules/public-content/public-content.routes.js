import { Router } from 'express';
import { authRateLimit } from '../../common/middleware/authRateLimit.js';
import {
  getPageHandler,
  subscribeNewsletterHandler,
  submitContactHandler,
  requestDemoHandler,
} from './public-content.controller.js';

const router = Router();

// No auth — these are anonymous public-website endpoints. Each mutating
// endpoint is rate-limited per IP to resist scripted abuse (spec: contact,
// newsletter, and demo-request are explicit abuse targets).
router.get('/pages/:slug', getPageHandler);

router.post(
  '/newsletter',
  authRateLimit({ keyPrefix: 'public-newsletter', windowSeconds: 3600, max: 5 }),
  subscribeNewsletterHandler
);

router.post(
  '/contact',
  authRateLimit({ keyPrefix: 'public-contact', windowSeconds: 3600, max: 10 }),
  submitContactHandler
);

router.post(
  '/demo-request',
  authRateLimit({ keyPrefix: 'public-demo-request', windowSeconds: 3600, max: 10 }),
  requestDemoHandler
);

export default router;
