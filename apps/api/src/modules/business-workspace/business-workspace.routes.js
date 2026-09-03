import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { resolveWorkspaceContext } from '../../common/middleware/workspaceContext.js';
import {
  getWorkspaceHandler,
  updateWorkspaceHandler,
  listRolesHandler,
  createRoleHandler,
  updateRoleHandler,
  deleteRoleHandler,
} from './business-workspace.controller.js';

const router = Router();

router.use(requireAuth, resolveWorkspaceContext);

router.get('/', getWorkspaceHandler);
router.patch('/', updateWorkspaceHandler);

router.get('/roles', listRolesHandler);
router.post('/roles', createRoleHandler);
router.patch('/roles/:id', updateRoleHandler);
router.delete('/roles/:id', deleteRoleHandler);

export default router;
