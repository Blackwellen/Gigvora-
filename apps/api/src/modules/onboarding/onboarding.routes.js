import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { resolveWorkspaceContext } from '../../common/middleware/workspaceContext.js';
import {
  getOrCreateSessionHandler,
  getSessionHandler,
  saveStepHandler,
  completeSessionHandler,
  abandonSessionHandler,
  getTrackConfigHandler,
  getRecommendationsHandler,
} from './onboarding.controller.js';

const router = Router();

router.use(requireAuth, resolveWorkspaceContext);

router.get('/config/:track', getTrackConfigHandler);
router.get('/recommendations', getRecommendationsHandler);
router.get('/sessions/track/:track', getOrCreateSessionHandler);
router.get('/sessions/:sessionId', getSessionHandler);
router.put('/sessions/:sessionId/steps/:stepKey', saveStepHandler);
router.post('/sessions/:sessionId/complete', completeSessionHandler);
router.post('/sessions/:sessionId/abandon', abandonSessionHandler);

export default router;
