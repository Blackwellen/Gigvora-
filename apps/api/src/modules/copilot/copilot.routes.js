import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { userRateLimit } from '../../common/middleware/userRateLimit.js';
import {
  summaryHandler,
  askHandler,
  listThreadsHandler,
  createThreadHandler,
  getThreadHandler,
  postThreadMessageHandler,
  cancelThreadGenerationHandler,
} from './copilot.controller.js';

const router = Router();
router.use(requireAuth);

// Generation is by far the most expensive call here (a real Azure OpenAI
// request per call) — rate-limited per §77, generous enough for normal
// back-and-forth chat use.
const generationLimit = userRateLimit({ keyPrefix: 'copilot-generate', windowSeconds: 60, max: 20 });

router.get('/summary', summaryHandler);
router.post('/ask', generationLimit, askHandler);

router.get('/threads', listThreadsHandler);
router.post('/threads', createThreadHandler);
router.get('/threads/:id', getThreadHandler);
router.post('/threads/:id/messages', generationLimit, postThreadMessageHandler);
router.post('/threads/:id/cancel', cancelThreadGenerationHandler);

export default router;
