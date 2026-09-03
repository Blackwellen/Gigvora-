import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import {
  listContextsHandler,
  switchContextHandler,
  starContextHandler,
  createWorkspaceHandler,
} from './workspaces.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/', listContextsHandler);
router.post('/switch', switchContextHandler);
router.post('/:companyId/star', starContextHandler);
router.post('/create', createWorkspaceHandler);

export default router;
