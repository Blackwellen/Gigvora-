import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { listHandler, createHandler, updateHandler, removeHandler } from './jobAlerts.controller.js';

const router = Router();
router.use(requireAuth);

router.get('/', listHandler);
router.post('/', createHandler);
router.patch('/:id', updateHandler);
router.delete('/:id', removeHandler);

export default router;
