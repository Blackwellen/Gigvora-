import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { listUpcomingHandler } from './calendar.controller.js';

const router = Router();
router.use(requireAuth);

router.get('/events', listUpcomingHandler);

export default router;
