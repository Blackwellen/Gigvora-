import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { resolveWorkspaceContext } from '../../common/middleware/workspaceContext.js';
import { listHandler, inviteHandler, updateHandler, removeHandler } from './business-members.controller.js';

const router = Router();

router.use(requireAuth, resolveWorkspaceContext);

router.get('/', listHandler);
router.post('/', inviteHandler);
router.patch('/:id', updateHandler);
router.delete('/:id', removeHandler);

export default router;
