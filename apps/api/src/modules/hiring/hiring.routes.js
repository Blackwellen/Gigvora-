import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { resolveWorkspaceContext } from '../../common/middleware/workspaceContext.js';
import {
  overviewHandler,
  listPlansHandler,
  createPlanHandler,
  updatePlanHandler,
  removePlanHandler,
  bottlenecksHandler,
} from './hiring.controller.js';

const router = Router();

router.use(requireAuth, resolveWorkspaceContext);

router.get('/overview', overviewHandler);
router.get('/plans', listPlansHandler);
router.post('/plans', createPlanHandler);
router.patch('/plans/:id', updatePlanHandler);
router.delete('/plans/:id', removePlanHandler);
router.get('/bottlenecks', bottlenecksHandler);

export default router;
