import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { resolveWorkspaceContext } from '../../common/middleware/workspaceContext.js';
import {
  listPlansHandler,
  getPlanHandler,
  createPlanHandler,
  updatePlanHandler,
  createScenarioHandler,
  updateScenarioHandler,
} from './workforce-planning.controller.js';

const router = Router();

router.use(requireAuth, resolveWorkspaceContext);

router.get('/plans', listPlansHandler);
router.get('/plans/:id', getPlanHandler);
router.post('/plans', createPlanHandler);
router.patch('/plans/:id', updatePlanHandler);
router.post('/plans/:id/scenarios', createScenarioHandler);

router.patch('/scenarios/:id', updateScenarioHandler);

export default router;
