import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { requireRecruiterSeat } from '../../common/middleware/recruiterSeat.js';
import { getOverviewHandler } from './recruiter-analytics.controller.js';

const router = Router();
router.use(requireAuth, requireRecruiterSeat);

router.get('/overview', getOverviewHandler);

export default router;
