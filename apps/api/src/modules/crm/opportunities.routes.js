import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { resolveWorkspaceContext } from '../../common/middleware/workspaceContext.js';
import { listHandler, getHandler, createHandler, updateHandler, removeHandler, moveHandler, closeHandler } from './opportunities.controller.js';

const router = Router();

router.use(requireAuth, resolveWorkspaceContext);

router.get('/', listHandler);
router.get('/:id', getHandler);
router.post('/', createHandler);
router.patch('/:id', updateHandler);
router.delete('/:id', removeHandler);
router.patch('/:id/move', moveHandler);
router.post('/:id/close', closeHandler);

export default router;
