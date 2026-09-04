import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { requireRecruiterProSeat } from '../../common/middleware/requireRecruiterProSeat.js';
import { listActivityHandler } from './candidate-activity.controller.js';

const router = Router();
router.use(requireAuth, requireRecruiterProSeat);

router.get('/', listActivityHandler);

export default router;
