import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { resolveWorkspaceContext } from '../../common/middleware/workspaceContext.js';
import { listHandler, getHandler, createHandler, updateHandler, removeHandler, previewHandler, recalculateHandler } from './segments.controller.js';

const router = Router();

router.use(requireAuth, resolveWorkspaceContext);

router.get('/', listHandler);
router.post('/preview', previewHandler);
router.get('/:id', getHandler);
router.post('/', createHandler);
router.patch('/:id', updateHandler);
router.delete('/:id', removeHandler);
router.post('/:id/recalculate', recalculateHandler);

export default router;
