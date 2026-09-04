import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { requireRecruiterProSeat } from '../../common/middleware/requireRecruiterProSeat.js';
import { listHandler, overrideHandler, scoreOnDemandHandler } from './ai-candidate-matching.controller.js';

const router = Router();
router.use(requireAuth, requireRecruiterProSeat);

router.get('/', listHandler);
router.post('/score', scoreOnDemandHandler);
router.patch('/:id/override', overrideHandler);

export default router;
