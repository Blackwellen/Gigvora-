import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { resolveWorkspaceContext } from '../../common/middleware/workspaceContext.js';
import { listHandler, getHandler, createHandler, updateHandler, removeHandler, searchDuplicatesHandler } from './contacts.controller.js';

const router = Router();

router.use(requireAuth, resolveWorkspaceContext);

router.get('/dedupe-search', searchDuplicatesHandler);
router.get('/', listHandler);
router.get('/:id', getHandler);
router.post('/', createHandler);
router.patch('/:id', updateHandler);
router.delete('/:id', removeHandler);

export default router;
