import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { getComparisonHandler, listMyRequestsHandler, createRequestHandler } from './recruiter-upgrade.controller.js';

const router = Router();
router.use(requireAuth);

// Not gated by requireRecruiterSeat — a Standard user upgrading to Pro, or
// someone with no seat at all evaluating recruiter plans, both need this page.
router.get('/comparison', getComparisonHandler);
router.get('/requests', listMyRequestsHandler);
router.post('/requests', createRequestHandler);

export default router;
