import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { listHandler, getHandler, createHandler, updateHandler, removeHandler, pendingRequestsHandler } from './connections.controller.js';

const router = Router();

// Must be registered before the '/:id' route so it isn't shadowed.
router.get('/requests/pending', requireAuth, pendingRequestsHandler);

router.get('/', listHandler);
router.get('/:id', getHandler);
router.post('/', requireAuth, createHandler);
router.patch('/:id', requireAuth, updateHandler);
router.delete('/:id', requireAuth, removeHandler);

export default router;
