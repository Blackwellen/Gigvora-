import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { resolveWorkspaceContext } from '../../common/middleware/workspaceContext.js';
import { searchHandler, getHandler } from './talent-discovery.controller.js';

const router = Router();

router.use(requireAuth, resolveWorkspaceContext);

router.get('/', searchHandler);
router.get('/:userId', getHandler);

export default router;
