import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { listHandler, getHandler, createHandler, updateHandler, removeHandler } from './profiles.controller.js';

const router = Router();

router.get('/', listHandler);
router.get('/:id', getHandler);
router.post('/', requireAuth, createHandler);
router.patch('/:id', requireAuth, updateHandler);
router.delete('/:id', requireAuth, removeHandler);

export default router;
