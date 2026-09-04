import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { requireRecruiterSeat } from '../../common/middleware/recruiterSeat.js';
import { getHomeHandler } from './recruiter-home.controller.js';

const router = Router();
router.use(requireAuth, requireRecruiterSeat);

router.get('/', getHomeHandler);

export default router;
