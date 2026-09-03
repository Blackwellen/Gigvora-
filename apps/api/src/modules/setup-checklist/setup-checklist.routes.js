import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { resolveWorkspaceContext } from '../../common/middleware/workspaceContext.js';
import { getChecklistHandler, dismissItemHandler } from './setup-checklist.controller.js';

const router = Router();

router.use(requireAuth, resolveWorkspaceContext);

router.get('/', getChecklistHandler);
router.post('/:itemKey/dismiss', dismissItemHandler);

export default router;
