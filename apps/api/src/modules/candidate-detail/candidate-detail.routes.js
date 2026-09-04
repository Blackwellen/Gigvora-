import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { requireRecruiterSeat } from '../../common/middleware/recruiterSeat.js';
import { getHandler } from './candidate-detail.controller.js';

const router = Router();
router.use(requireAuth, requireRecruiterSeat);

router.get('/:candidateId', getHandler);

export default router;
