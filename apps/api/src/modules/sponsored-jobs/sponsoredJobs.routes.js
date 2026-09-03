import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { resolveWorkspaceContext } from '../../common/middleware/workspaceContext.js';
import { listHandler, getHandler, byJobHandler, createHandler, updateHandler, eventsHandler } from './sponsoredJobs.controller.js';

const router = Router();
router.use(requireAuth, resolveWorkspaceContext);

router.get('/', listHandler);
router.get('/by-job/:jobId', byJobHandler);

router.get('/:id', getHandler);
router.post('/', createHandler);
router.patch('/:id', updateHandler);
router.get('/:id/events', eventsHandler);

export default router;
