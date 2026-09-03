import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { listHandler, getHandler, createHandler, updateHandler, removeHandler } from './applications.controller.js';

const router = Router();

router.get('/', requireAuth, listHandler);
router.get('/:id', requireAuth, getHandler);
router.post('/', requireAuth, createHandler);
router.patch('/:id', requireAuth, updateHandler);
router.delete('/:id', requireAuth, removeHandler);

export default router;
