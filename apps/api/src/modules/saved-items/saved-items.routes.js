import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { listHandler, removeHandler, pinHandler } from './saved-items.controller.js';

const router = Router();
router.use(requireAuth);

router.get('/', listHandler);
router.delete('/:id', removeHandler);
router.post('/:id/pin', pinHandler);

export default router;
