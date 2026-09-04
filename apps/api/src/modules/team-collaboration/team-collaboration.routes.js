import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { requireRecruiterProSeat } from '../../common/middleware/requireRecruiterProSeat.js';
import { listEventsHandler, postCommentHandler } from './team-collaboration.controller.js';

const router = Router();
router.use(requireAuth, requireRecruiterProSeat);

router.get('/events', listEventsHandler);
router.post('/comments', postCommentHandler);

export default router;
