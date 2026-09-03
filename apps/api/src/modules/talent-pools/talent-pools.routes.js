import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { resolveWorkspaceContext } from '../../common/middleware/workspaceContext.js';
import {
  listHandler,
  getHandler,
  createHandler,
  updateHandler,
  removeHandler,
  addMemberHandler,
  removeMemberHandler,
} from './talent-pools.controller.js';

const router = Router();

router.use(requireAuth, resolveWorkspaceContext);

router.get('/', listHandler);
router.post('/', createHandler);
router.get('/:id', getHandler);
router.patch('/:id', updateHandler);
router.delete('/:id', removeHandler);

router.post('/:id/members', addMemberHandler);
router.delete('/:id/members/:memberId', removeMemberHandler);

export default router;
