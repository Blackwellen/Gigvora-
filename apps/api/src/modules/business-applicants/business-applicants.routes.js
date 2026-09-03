import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { resolveWorkspaceContext } from '../../common/middleware/workspaceContext.js';
import { listHandler, summaryHandler, getHandler } from './business-applicants.controller.js';

const router = Router();

router.use(requireAuth, resolveWorkspaceContext);

// Fixed sub-path must be declared before the ':id' catch-all.
router.get('/summary', summaryHandler);

router.get('/', listHandler);
router.get('/:id', getHandler);

export default router;
