import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { resolveWorkspaceContext } from '../../common/middleware/workspaceContext.js';
import { listHandler, getHandler, createHandler, updateHandler, removeHandler, completeHandler, snoozeHandler } from './followups.controller.js';

const router = Router();

router.use(requireAuth, resolveWorkspaceContext);

router.get('/', listHandler);
router.get('/:id', getHandler);
router.post('/', createHandler);
router.patch('/:id', updateHandler);
router.delete('/:id', removeHandler);
router.patch('/:id/complete', completeHandler);
router.patch('/:id/snooze', snoozeHandler);

export default router;
