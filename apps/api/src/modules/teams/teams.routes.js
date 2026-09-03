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
  updateMemberHandler,
  removeMemberHandler,
} from './teams.controller.js';

const router = Router();

router.use(requireAuth, resolveWorkspaceContext);

router.get('/', listHandler);
router.get('/:id', getHandler);
router.post('/', createHandler);
router.patch('/:id', updateHandler);
router.delete('/:id', removeHandler);

router.post('/:id/members', addMemberHandler);
router.patch('/:id/members/:memberId', updateMemberHandler);
router.delete('/:id/members/:memberId', removeMemberHandler);

export default router;
