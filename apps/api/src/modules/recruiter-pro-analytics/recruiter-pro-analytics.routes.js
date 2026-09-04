import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { requireRecruiterProSeat } from '../../common/middleware/requireRecruiterProSeat.js';
import { getOverviewHandler } from './recruiter-pro-analytics.controller.js';

const router = Router();
router.use(requireAuth, requireRecruiterProSeat);

router.get('/overview', getOverviewHandler);

export default router;
