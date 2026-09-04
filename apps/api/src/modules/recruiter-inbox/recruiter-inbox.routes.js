import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { requireRecruiterSeat } from '../../common/middleware/recruiterSeat.js';
import { listHandler, startThreadHandler, updateStatusHandler } from './recruiter-inbox.controller.js';

const router = Router();
router.use(requireAuth, requireRecruiterSeat);

router.get('/', listHandler);
router.post('/threads', startThreadHandler);
router.patch('/threads/:id/status', updateStatusHandler);

export default router;
