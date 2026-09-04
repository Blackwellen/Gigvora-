import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { requireRecruiterProSeat } from '../../common/middleware/requireRecruiterProSeat.js';
import { listHandler, updateHandler } from './advanced-alerts.controller.js';

const router = Router();
router.use(requireAuth, requireRecruiterProSeat);

router.get('/', listHandler);
router.patch('/:id', updateHandler);

export default router;
