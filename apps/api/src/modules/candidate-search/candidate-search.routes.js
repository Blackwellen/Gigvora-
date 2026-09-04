import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { requireRecruiterSeat } from '../../common/middleware/recruiterSeat.js';
import { searchHandler } from './candidate-search.controller.js';

const router = Router();
router.use(requireAuth, requireRecruiterSeat);

router.get('/', searchHandler);

export default router;
