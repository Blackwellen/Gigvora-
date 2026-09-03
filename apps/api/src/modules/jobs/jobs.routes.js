import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { resolveWorkspaceContext } from '../../common/middleware/workspaceContext.js';
import {
  listHandler,
  getHandler,
  createHandler,
  updateHandler,
  removeHandler,
  recommendedHandler,
  savedHandler,
  saveHandler,
  unsaveHandler,
  applicantsHandler,
  analyticsHandler,
} from './jobs.controller.js';

const router = Router();

// Public browse/search — no auth required, matches projects.routes.js.
router.get('/', listHandler);

// Fixed sub-paths must be declared before the ':id' catch-all.
router.get('/recommended', requireAuth, recommendedHandler);
router.get('/saved', requireAuth, savedHandler);

router.get('/:id', getHandler);

router.post('/', requireAuth, resolveWorkspaceContext, createHandler);
router.patch('/:id', requireAuth, resolveWorkspaceContext, updateHandler);
router.delete('/:id', requireAuth, resolveWorkspaceContext, removeHandler);

router.post('/:id/save', requireAuth, saveHandler);
router.delete('/:id/save', requireAuth, unsaveHandler);

router.get('/:id/applicants', requireAuth, resolveWorkspaceContext, applicantsHandler);
router.get('/:id/analytics', requireAuth, resolveWorkspaceContext, analyticsHandler);

export default router;
