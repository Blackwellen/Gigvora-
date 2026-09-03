import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { userRateLimit } from '../../common/middleware/userRateLimit.js';
import {
  getAccountSummaryHandler,
  listCampaignsHandler,
  createCampaignHandler,
  getCampaignHandler,
  updateCampaignHandler,
  submitForReviewHandler,
  pauseCampaignHandler,
  resumeCampaignHandler,
  serveFeedAdHandler,
  serveJobAdHandler,
  serveCompanyAdHandler,
  recordImpressionHandler,
  recordClickHandler,
  getBillingHistoryHandler,
} from './ads.controller.js';
import { createBillingPortalHandler } from './adsBillingPortal.controller.js';

const router = Router();
router.use(requireAuth);

router.get('/account', getAccountSummaryHandler);
router.get('/billing-history', getBillingHistoryHandler);
router.post('/billing-portal', createBillingPortalHandler);

router.get('/campaigns', listCampaignsHandler);
router.post('/campaigns', userRateLimit({ keyPrefix: 'ads-campaign-create', windowSeconds: 60, max: 10 }), createCampaignHandler);
router.get('/campaigns/:id', getCampaignHandler);
router.patch('/campaigns/:id', updateCampaignHandler);
router.post('/campaigns/:id/submit-for-review', submitForReviewHandler);
router.post('/campaigns/:id/pause', pauseCampaignHandler);
router.post('/campaigns/:id/resume', resumeCampaignHandler);

// Ad-serving surfaces — the client requests a slot and splices the real
// result into the real feed/search results it already fetched separately.
router.get('/serve/feed', serveFeedAdHandler);
router.get('/serve/jobs', serveJobAdHandler);
router.get('/serve/companies', serveCompanyAdHandler);

router.post('/impressions', recordImpressionHandler);
router.post('/clicks', recordClickHandler);

export default router;
