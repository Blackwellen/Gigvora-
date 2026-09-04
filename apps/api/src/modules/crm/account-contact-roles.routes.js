import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { resolveWorkspaceContext } from '../../common/middleware/workspaceContext.js';
import { listHandler, createHandler, updateHandler, removeHandler } from './account-contact-roles.controller.js';

const router = Router({ mergeParams: true });

router.use(requireAuth, resolveWorkspaceContext);

router.get('/', listHandler);
router.post('/', createHandler);
router.patch('/:roleId', updateHandler);
router.delete('/:roleId', removeHandler);

export default router;
