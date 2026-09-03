import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { resolveWorkspaceContext } from '../../common/middleware/workspaceContext.js';
import {
  listHandler,
  summaryHandler,
  listBudgetsHandler,
  createHandler,
  updateHandler,
  createBudgetHandler,
  updateBudgetHandler,
} from './spend.controller.js';

const router = Router();

router.use(requireAuth, resolveWorkspaceContext);

router.get('/', listHandler);
router.get('/summary', summaryHandler);
router.get('/budgets', listBudgetsHandler);

router.post('/', createHandler);
router.patch('/:id', updateHandler);

router.post('/budgets', createBudgetHandler);
router.patch('/budgets/:id', updateBudgetHandler);

export default router;
