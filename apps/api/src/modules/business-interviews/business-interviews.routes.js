import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { resolveWorkspaceContext } from '../../common/middleware/workspaceContext.js';
import { listHandler, getHandler } from './business-interviews.controller.js';

const router = Router();

router.use(requireAuth, resolveWorkspaceContext);

router.get('/', listHandler);
router.get('/:id', getHandler);

export default router;
