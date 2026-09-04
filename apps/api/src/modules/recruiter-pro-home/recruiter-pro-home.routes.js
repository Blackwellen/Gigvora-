import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { requireRecruiterProSeat } from '../../common/middleware/requireRecruiterProSeat.js';
import { getHomeHandler } from './recruiter-pro-home.controller.js';

const router = Router();
router.use(requireAuth, requireRecruiterProSeat);

router.get('/', getHomeHandler);

export default router;
