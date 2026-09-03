import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { listUpcomingHandler, updateStatusHandler } from './tasks.controller.js';

const router = Router();
router.use(requireAuth);

router.get('/', listUpcomingHandler);
router.patch('/:id', updateStatusHandler);

export default router;
