import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { listHandler, getHandler, unreadCountHandler, createHandler, updateHandler, removeHandler } from './notifications.controller.js';

const router = Router();

router.get('/', requireAuth, listHandler);
router.get('/unread-count', requireAuth, unreadCountHandler);
router.get('/:id', getHandler);
router.post('/', requireAuth, createHandler);
router.patch('/:id', requireAuth, updateHandler);
router.delete('/:id', requireAuth, removeHandler);

export default router;
