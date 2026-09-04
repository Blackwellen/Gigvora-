import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { resolveWorkspaceContext } from '../../common/middleware/workspaceContext.js';
import { overviewHandler, pipelineFunnelHandler, winLossTrendHandler, leadSourcesHandler, topAccountsHandler, stalePipelineHandler } from './analytics.controller.js';

const router = Router();

router.use(requireAuth, resolveWorkspaceContext);

router.get('/overview', overviewHandler);
router.get('/pipeline-funnel', pipelineFunnelHandler);
router.get('/win-loss-trend', winLossTrendHandler);
router.get('/lead-sources', leadSourcesHandler);
router.get('/top-accounts', topAccountsHandler);
router.get('/stale-pipeline', stalePipelineHandler);

export default router;
