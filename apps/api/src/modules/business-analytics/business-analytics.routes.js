import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { resolveWorkspaceContext } from '../../common/middleware/workspaceContext.js';
import { overviewHandler, trendsHandler } from './business-analytics.controller.js';

const router = Router();

router.use(requireAuth, resolveWorkspaceContext);

router.get('/overview', overviewHandler);
router.get('/trends', trendsHandler);

export default router;
