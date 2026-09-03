import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { listHandler, acceptHandler, declineHandler, blockHandler, spamHandler } from './messageRequests.controller.js';

const router = Router();
router.use(requireAuth);

router.get('/', listHandler);
router.post('/:id/accept', acceptHandler);
router.post('/:id/decline', declineHandler);
router.post('/:id/block', blockHandler);
router.post('/:id/spam', spamHandler);

export default router;
