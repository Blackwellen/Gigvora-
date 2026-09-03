import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { joinHandler, leaveHandler, endHandler, getInfoHandler } from './calls.controller.js';

const router = Router();
router.use(requireAuth);

router.post('/join', joinHandler);
router.post('/:id/leave', leaveHandler);
router.post('/:id/end', endHandler);
router.get('/:id', getInfoHandler);

export default router;
