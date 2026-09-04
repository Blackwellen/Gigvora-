import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { resolveWorkspaceContext } from '../../common/middleware/workspaceContext.js';
import { createHandler, getHandler, addRowsHandler, listRowsHandler, processHandler } from './imports.controller.js';

const router = Router();

router.use(requireAuth, resolveWorkspaceContext);

router.post('/', createHandler);
router.get('/:id', getHandler);
router.get('/:id/rows', listRowsHandler);
router.post('/:id/rows', addRowsHandler);
router.post('/:id/process', processHandler);

export default router;
